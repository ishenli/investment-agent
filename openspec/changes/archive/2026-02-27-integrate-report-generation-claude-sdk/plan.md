# 实现计划：报告生成集成 Claude Agent SDK

**分支**：`feature/report-claude-agent-sdk` | **日期**：2026-02-27 | **规范**：[proposal.md](./proposal.md)
**输入**：来自 `/openspec/changes/integrate-report-generation-claude-sdk/proposal.md` 的变更提案

## 概要

在不改动现有聊天能力和会话模型的前提下，**仅将报告生成链路中的 LLM 调用迁移到 Claude Agent SDK**，保持 `report-generation` 对外行为和数据结构完全兼容，为后续全面接入 claude-agent-sdk 打基础。

核心实现：
1. 在 `ReportService.generateAIReportContent()` 中替换 LangChain Agent 为 Claude Agent SDK
2. 实现工作区管理器（ReportWorkspaceManager），将报告数据写入临时文件供 Agent 读取
3. 复用现有模型配置逻辑（modelProviderResolver），保持 API 兼容性

## 技术上下文

**语言/版本**：TypeScript 5+ / Node.js >= 20
**主要依赖**：Next.js 16, @anthropic-ai/claude-agent-sdk (新增), Drizzle ORM
**存储**：SQLite (prod)
**测试**：Vitest
**目标平台**：桌面 Web (Electron + Web)
**项目类型**：Next.js App Router (SSR)
**性能目标**：报告生成 < 60s，Agent 执行 < 20 轮次
**约束条件**：必须保持现有 API 接口和数据模型完全兼容，不影响聊天功能

## 规范检查

- [x] 符合项目规范
- [x] TypeScript 严格模式约束
- [x] OpenSpec delta 格式正确性

## 项目结构

### 文档（此功能）

```text
openspec/changes/integrate-report-generation-claude-sdk/
├── proposal.md              # 变更提案
├── plan.md                  # 此文件
├── tasks.md                 # 任务清单
└── specs/
    └── report-generation/   # 修改现有 capability
        └── spec.md          # Delta 变更
```

### 源代码（项目根目录）

```text
src/
├── app/
│   └── api/
│       └── report/
│           └── route.ts                # 保持不变（无需修改）
├── server/
│   ├── lib/
│   │   └── reportWorkspace.ts          # 新增：工作区管理器
│   └── service/
│       └── reportService.ts            # 修改：generateAIReportContent()
└── shared/
    └── types/
        └── claude-agent.ts              # 新增：Claude Agent 类型（可选，用于类型安全）
```

**结构决策**：
- 仅修改 `reportService.ts` 中的 `generateAIReportContent()` 方法
- 新增 `reportWorkspace.ts` 作为独立模块，负责工作区文件管理
- **不修改**：API Route、Controller、Repository、Store、UI 组件

## 需求拆分

### User Stories (按优先级排序)

| 优先级 | 用户故事 | 独立验证 |
|--------|---------|---------|
| P1 | 作为系统，我需要用 Claude Agent SDK 替换 LangChain Agent 生成报告 | 调用 POST `/api/report`，验证返回的报告内容格式正确 |
| P2 | 作为 Agent，我需要读取结构化的报告数据文件 | 检查工作区目录包含所有必需文件（context.md、positions.json 等） |
| P3 | 作为系统，我需要在报告生成后清理临时工作区 | 验证报告生成后，临时目录已删除 |

## 技术架构

### 数据流

```
POST /api/report (不变)
       ↓
ReportController.generateReport() (不变)
       ↓
ReportService.generateReport() (不变)
       ↓
ReportService.aggregateReportData() (不变)
       ↓
┌────────────────────────────────────────────────────────────────┐
│ ReportService.generateAIReportContent() (本次修改)             │
│                                                                │
│  [旧实现] LangChain Agent                                      │
│    ├── chatModelOpenAI(modelSlug)                              │
│    ├── createAgent({ model, tools })                           │
│    └── agent.invoke({ messages })                              │
│                                                                │
│  [新实现] Claude Agent SDK                                     │
│    ├── getModelConfig(modelSlug) - 复用现有逻辑               │
│    ├── prepareWorkspace(reportData) - 写入数据文件            │
│    ├── query({ prompt, options }) - 调用 SDK                   │
│    └── cleanupWorkspace() - 清理临时文件                       │
└────────────────────────────────────────────────────────────────┘
       ↓
分析报告内容（Markdown，不变）
```

### 工作区架构

```
{projectRoot}/temp/report-generation/{reportId}/
├── context.md                 # 账户业绩、持仓摘要
├── positions.json             # 持仓明细（结构化）
├── transactions.json          # 交易记录
├── notes.json                 # 用户笔记
└── market-events.json         # 市场事件
```

**文件格式**：
- `context.md`：Markdown 格式，便于 Agent 阅读理解
- JSON 文件：结构化数据，Agent 可用 Read 工具读取后解析

### 状态管理

- **服务端**：
  - 报告数据存储在 `analysis_reports` 表（不变）
  - 工作区临时文件位于 `{projectRoot}/temp/report-generation/`
  - 无新增数据库表
- **客户端**：无变更

### 外部集成

- **Claude Agent SDK**：`@anthropic-ai/claude-agent-sdk`
  - 版本：`^0.2.x`
  - 使用 `query()` 函数执行 Agent
  - 内置工具：Read、Glob、Grep、WebSearch、Bash
- **模型配置**：复用 `modelProviderResolver` 获取 API Key 和 Base URL
- **文件系统**：Node.js `fs/promises` 用于工作区管理

## 核心实现

### 1. getModelConfig() 方法

```typescript
// src/server/service/reportService.ts
/**
 * 获取模型配置（复用 chatModelOpenAI 的逻辑）
 */
private async getModelConfig(modelSlug?: string): Promise<{
  apiKey: string;
  baseUrl: string;
  modelSlug: string;
}> {
  const account = await authService.getCurrentUserAccount();
  const accountId = parseInt(account.id);
  
  let config;
  if (modelSlug) {
    config = await modelProviderResolver.getActiveModelConfig(accountId, modelSlug);
    if (!config) {
      logger.warn(`Model ${modelSlug} not found, falling back to default`);
      config = await modelProviderResolver.getDefaultModelConfig(accountId);
    }
  } else {
    config = await modelProviderResolver.getDefaultModelConfig(accountId);
  }
  
  if (!config) {
    throw new Error('Model provider configuration not found');
  }
  
  return {
    apiKey: config.provider.apiKey,
    baseUrl: config.provider.baseUrl,
    modelSlug: config.model.slug,
  };
}
```

### 2. ReportWorkspaceManager

```typescript
// src/server/lib/reportWorkspace.ts
import { promises as fs } from 'fs';
import path from 'path';
import { getProjectRoot } from '@/server/base/database/DatabaseManager';
import type { WeeklyReportData } from '@/types/report';

export class ReportWorkspaceManager {
  private workspaceRoot: string;
  
  constructor() {
    const projectRoot = getProjectRoot();
    this.workspaceRoot = path.join(projectRoot, 'temp', 'report-generation');
  }
  
  /**
   * 创建工作区并写入数据文件
   */
  async createWorkspace(reportId: string, reportData: WeeklyReportData): Promise<string> {
    const workDir = path.join(this.workspaceRoot, reportId);
    await fs.mkdir(workDir, { recursive: true });
    
    // 写入 context.md
    await fs.writeFile(
      path.join(workDir, 'context.md'),
      this.buildContextFile(reportData),
      'utf-8'
    );
    
    // 写入结构化数据文件
    await fs.writeFile(
      path.join(workDir, 'positions.json'),
      JSON.stringify(reportData.enrichedPositions, null, 2),
      'utf-8'
    );
    
    await fs.writeFile(
      path.join(workDir, 'transactions.json'),
      JSON.stringify(reportData.transactions, null, 2),
      'utf-8'
    );
    
    await fs.writeFile(
      path.join(workDir, 'notes.json'),
      JSON.stringify(reportData.notes, null, 2),
      'utf-8'
    );
    
    await fs.writeFile(
      path.join(workDir, 'market-events.json'),
      JSON.stringify(reportData.marketEvents, null, 2),
      'utf-8'
    );
    
    return workDir;
  }
  
  /**
   * 清理工作区
   */
  async cleanup(reportId: string): Promise<void> {
    const workDir = path.join(this.workspaceRoot, reportId);
    try {
      await fs.rm(workDir, { recursive: true, force: true });
    } catch (error) {
      logger.warn(`Failed to cleanup workspace ${workDir}:`, error);
    }
  }
  
  /**
   * 构建 context.md 文件内容
   */
  private buildContextFile(reportData: WeeklyReportData): string {
    return `
# 报告生成上下文

## 账户业绩数据

${this.buildPerformanceSection(reportData.performance)}

## 持仓详情

${this.buildPositionsSection(reportData.enrichedPositions)}

## 数据来源信息

${this.buildDataSourceSection(reportData.dataSourceSummary)}

## 其他数据文件

- \`positions.json\`: 持仓明细（包含实时行情、成本、盈亏等）
- \`transactions.json\`: 本周交易记录
- \`notes.json\`: 用户投资笔记
- \`market-events.json\`: 本周市场关键事件
    `.trim();
  }
  
  // 复用 ReportService 中现有的章节构建方法
  private buildPerformanceSection(performance: PerformanceCalculation): string {
    // ... 与 ReportService.buildPerformanceSection() 相同
  }
  
  private buildPositionsSection(positions: EnrichedPosition[]): string {
    // ... 与 ReportService.buildPositionsSection() 相同
  }
  
  private buildDataSourceSection(summary: DataSourceSummary): string {
    // ... 与 ReportService.buildDataSourceSection() 相同
  }
}
```

### 3. generateAIReportContent() 改造

```typescript
// src/server/service/reportService.ts
import { query } from "@anthropic-ai/claude-agent-sdk";
import { ReportWorkspaceManager } from '@/server/lib/reportWorkspace';

/**
 * 生成AI报告内容（使用 Claude Agent SDK）
 */
private async generateAIReportContent(
  reportData: WeeklyReportData,
  modelSlug?: string
): Promise<string> {
  const reportId = nanoid();
  const workspaceManager = new ReportWorkspaceManager();
  
  try {
    // 1. 获取模型配置
    const modelConfig = await this.getModelConfig(modelSlug);
    logger.info('[ReportService] Using model:', modelConfig.modelSlug);
    
    // 2. 准备工作区
    const workDir = await workspaceManager.createWorkspace(reportId, reportData);
    logger.info('[ReportService] Workspace created:', workDir);
    
    // 3. 构建 Prompt
    const prompt = `
请阅读工作区中的数据文件，生成一份专业的投资周报。

## 数据文件说明
- context.md: 账户业绩和持仓摘要
- positions.json: 持仓明细
- transactions.json: 本周交易记录
- notes.json: 用户投资笔记
- market-events.json: 本周市场事件

## 输出要求
生成 Markdown 格式的报告，包含以下章节：
1. **市场与账户概览**：本周收益率、与基准对比
2. **持仓异动分析**：各持仓盈亏情况、风险变化
3. **信息与笔记回顾**：关键市场事件和用户笔记
4. **下周展望与建议**：投资策略建议

语气专业、客观，数据驱动。如果数据时效性分数低于 0.5，请在报告中提示。
    `.trim();
    
    // 4. 调用 Claude Agent SDK
    let finalResult = '';
    for await (const message of query({
      prompt,
      options: {
        apiKey: modelConfig.apiKey,
        baseURL: modelConfig.baseUrl,
        model: modelConfig.modelSlug,
        cwd: workDir,
        allowedTools: ["Read", "Glob", "Grep", "WebSearch"],
        permissionMode: "acceptEdits",
        systemPrompt: `
你是一位专业的投资顾问，负责分析投资数据并生成周报。

## 工具使用指南
- Read: 读取数据文件（context.md、JSON 文件）
- Glob: 查找文件
- Grep: 搜索笔记中的关键词
- WebSearch: 搜索最新市场新闻和公司信息

## 分析原则
- 数据驱动：基于提供的持仓、交易、业绩数据
- 客观中立：不做主观推测，仅基于事实分析
- 风险提示：标注潜在风险和不确定性
        `.trim(),
        maxTurns: 20,
        maxBudgetUsd: 0.5,
      },
    })) {
      // 流式消息处理（可选：记录中间步骤）
      if ("status" in message) {
        logger.debug('[ReportService] Agent status:', message.status);
      }
      
      // 最终结果
      if ("result" in message) {
        finalResult = message.result;
        logger.info('[ReportService] Report generation completed');
      }
    }
    
    if (!finalResult) {
      throw new Error('Agent did not return any result');
    }
    
    return finalResult;
    
  } catch (error) {
    logger.error('[ReportService] Failed to generate AI report:', error);
    throw new Error(
      `AI报告生成失败: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    // 5. 清理工作区（无论成功或失败）
    await workspaceManager.cleanup(reportId);
  }
}
```

## 复杂性跟踪

| 违规 | 为何需要 | 更简单的替代方案被拒绝的原因 |
|------|---------|----------------------------|
| 引入 Claude Agent SDK | 需要更强的工具能力和多步骤推理 | LangChain Agent 工具能力有限，无法执行文件操作和复杂分析 |
| 工作区文件管理 | Agent 需要通过文件系统读取数据 | 直接传递 JSON 字符串会超出 context 限制，且不利于 Agent 理解结构 |

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Agent 执行超时 | 高 | 设置 maxTurns=20, maxBudgetUsd=0.5 限制 |
| 工作区文件泄露 | 中 | 生成后立即清理，使用唯一 reportId 隔离 |
| 成本超支 | 中 | maxBudgetUsd 限制单次成本，监控总消耗 |
| 报告质量下降 | 高 | 并行测试期，与 LangChain 版本对比质量 |

## 性能考虑

- **执行时长**：预计 30-60 秒（Agent 需要读取文件、调用工具）
- **Token 消耗**：估计 10k-50k tokens（取决于数据量和轮次）
- **文件 I/O**：工作区创建/清理 < 1 秒
- **并发控制**：通过队列限制同时生成的报告数量（建议最多 3 个）

## 安全考虑

- **文件访问隔离**：`cwd` 限制在 `temp/report-generation/{reportId}/`，Agent 无法访问项目其他文件
- **权限模式**：使用 `acceptEdits` 自动接受文件编辑（仅限工作区内）
- **敏感数据**：API Key 从数据库获取，不暴露在日志中
- **工作区清理**：`finally` 块确保无论成功失败都会清理

## 测试策略

- **单元测试**:
  - ReportWorkspaceManager.createWorkspace()
  - ReportWorkspaceManager.cleanup()
  - ReportService.getModelConfig()
- **集成测试**:
  - 完整报告生成流程（从 API 到返回结果）
  - 工作区文件内容正确性验证
- **质量对比测试**:
  - 与 LangChain Agent 生成的报告对比
  - 验证输出格式符合规范
