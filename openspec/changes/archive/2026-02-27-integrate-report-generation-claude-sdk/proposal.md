# Change: 报告生成集成 Claude Agent SDK

## Why

当前报告生成功能使用 LangChain Agent 调用 LLM 生成报告内容，但存在以下局限：

1. **工具能力受限**：现有 LangChain Agent 只能使用预定义的有限工具（stockSearchNewsTool、stockRecallCompanyInfoTool、noteQueryTool、TravilySearchTool），无法扩展更多分析工具
2. **执行深度不足**：Agent 只能简单调用工具并返回结果，无法执行复杂的多步骤分析任务（如"读取历史报告、对比分析、生成改进建议"）
3. **缺乏迭代优化能力**：生成一次即结束，无法根据数据分析结果迭代优化报告质量
4. **与 Chat 能力割裂**：报告生成和对话使用不同的 Agent 实现，未来集成 Claude Agent SDK 后会产生技术栈分化

Claude Agent SDK 可以解决这些问题：

- **强大的内置工具**：File Read/Write/Edit、Bash、Glob/Grep、WebSearch/WebFetch，可以读取历史报告、执行数据分析脚本
- **工作流执行能力**：多轮自主决策，可以按需调用不同工具完成复杂分析
- **MCP Server 扩展**：可集成外部工具（如数据库分析器、图表生成器）
- **技术栈统一**：与 Chat 系统共享同一套 Agent 基础设施

## What Changes

### 核心变更

1. **保持现有报告生成链路不变**：聊天功能、会话管理、报告编辑等功能完全不变
2. **仅替换 LLM 调用层**：在 `ReportService.generateAIReportContent()` 中，将 LangChain Agent 替换为 Claude Agent SDK
3. **保持 API 接口兼容**：POST `/api/report` 接口的请求/响应格式不变
4. **保持数据模型兼容**：`analysis_reports` 表结构不变，报告内容格式不变

### 技术实现

#### 现有实现（LangChain Agent）

```typescript
// src/server/service/reportService.ts
private async generateAIReportContent(reportData: WeeklyReportData, modelSlug?: string): Promise<string> {
  const llm = await chatModelOpenAI(modelSlug);
  
  // 创建 LangChain Agent
  const agent = createAgent({
    model: llm,
    tools: [stockSearchNewsTool, stockRecallCompanyInfoTool, noteQueryTool, TravilySearchTool],
  });
  
  const response = await agent.invoke({
    messages: [
      new SystemMessage("你是投资顾问..."),
      new HumanMessage(prompt),
    ],
  });
  
  return response.messages.at(-1)?.content as string;
}
```

#### 新实现（Claude Agent SDK）

```typescript
// src/server/service/reportService.ts
import { query } from "@anthropic-ai/claude-agent-sdk";

private async generateAIReportContent(reportData: WeeklyReportData, modelSlug?: string): Promise<string> {
  // 1. 获取模型配置（复用现有 chatModelOpenAI 逻辑）
  const modelConfig = await this.getModelConfig(modelSlug);
  
  // 2. 准备工作区（存放临时数据文件，供 Agent 读取）
  const workDir = await this.prepareWorkspace(reportData);
  
  // 3. 构建 Prompt（保持原有格式）
  const prompt = this.buildAIPrompt(reportData);
  
  // 4. 调用 Claude Agent SDK
  let finalResult = '';
  for await (const message of query({
    prompt,
    options: {
      apiKey: modelConfig.apiKey,
      baseURL: modelConfig.baseUrl,
      model: modelConfig.modelSlug,
      cwd: workDir,
      allowedTools: ["Read", "Glob", "Grep", "WebSearch", "Bash"],
      permissionMode: "acceptEdits",
      maxTurns: 20,
      maxBudgetUsd: 0.5,
      systemPrompt: "你是专业的投资顾问，根据提供的数据生成投资周报...",
    },
  })) {
    if ("result" in message) {
      finalResult = message.result;
    }
  }
  
  // 5. 清理工作区
  await this.cleanupWorkspace(workDir);
  
  return finalResult;
}
```

### 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                    Report Generation Flow (不变)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  POST /api/report                                               │
│         ↓                                                       │
│  ReportController.generateReport()                              │
│         ↓                                                       │
│  ReportService.generateReport()                                 │
│         ↓                                                       │
│  ReportService.aggregateReportData()  (不变)                    │
│         ↓                                                       │
│  ┌─────────────────────────────────────────────────┐           │
│  │ ReportService.generateAIReportContent()          │           │
│  │  (本次唯一修改点)                                │           │
│  │                                                  │           │
│  │  [旧] LangChain Agent                            │           │
│  │       └── chatModelOpenAI()                      │           │
│  │       └── LangChain Tools                        │           │
│  │                                                  │           │
│  │  [新] Claude Agent SDK                           │           │
│  │       └── getModelConfig() (复用 chatModelOpenAI) │           │
│  │       └── query()                                │           │
│  │           ├── File Read/Write                    │           │
│  │           ├── Glob/Grep                          │           │
│  │           ├── WebSearch                          │           │
│  │           └── Bash                               │           │
│  └─────────────────────────────────────────────────┘           │
│         ↓                                                       │
│  分析报告内容（Markdown）                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Workspace 设计

为了让 Claude Agent 能够读取报告数据，需要将聚合后的数据写入临时工作区：

```
{projectRoot}/temp/report-generation/{reportId}/
├── context.md          # 报告上下文（账户业绩、持仓详情）
├── positions.json      # 持仓明细（结构化数据）
├── transactions.json   # 交易记录
├── notes.json          # 用户笔记
├── market-events.json  # 市场事件
└── historical/         # 历史报告（可选，供对比分析）
    ├── last-week.md
    └── last-month.md
```

### 工具映射

| LangChain Tools | Claude Agent SDK Tools | 说明 |
|-----------------|------------------------|------|
| stockSearchNewsTool | WebSearch | 搜索股票新闻 |
| stockRecallCompanyInfoTool | Read + Glob | 读取缓存的公司信息文件 |
| noteQueryTool | Grep | 搜索笔记 JSON 文件 |
| TravilySearchTool | WebSearch | Web 搜索 |
| 无 | Bash | 执行数据分析脚本（新增能力） |
| 无 | Edit | 编辑报告文件（新增能力） |

## Impact

- Affected specs: `report-generation` (修改)
- Affected code:
  - `src/server/service/reportService.ts` - 修改 `generateAIReportContent()` 方法
  - `src/server/lib/reportWorkspace.ts` - 新增工作区管理器
  - `package.json` - 添加 `@anthropic-ai/claude-agent-sdk` 依赖
- **不影响的代码**：
  - Chat 相关的所有功能（Session、Message、Plugin、Skills）
  - 报告编辑功能（EditReportDrawer）
  - 报告列表和详情展示
  - 数据聚合逻辑（calculatePerformance、aggregateReportData）

### 数据兼容性

- `analysis_reports` 表：无需修改，现有字段完全兼容
- 报告内容格式：仍为 Markdown，保持现有章节结构
- API 接口：`POST /api/report` 的请求/响应格式不变

### 风险控制

- **成本控制**：通过 `maxBudgetUsd: 0.5` 限制单次报告生成成本（约 ¥3.5）
- **执行时长**：通过 `maxTurns: 20` 限制 Agent 轮次，预计总时长 < 60 秒
- **数据安全**：工作区位于项目目录内，Agent 无法访问系统其他文件
- **权限控制**：使用 `permissionMode: "acceptEdits"`，自动接受文件编辑（仅限工作区内）

### 回退方案

如果集成失败或效果不佳，可以快速回退到 LangChain Agent：

1. 代码修改仅在 `generateAIReportContent()` 方法内，回退只需恢复此方法
2. 无数据库迁移，无需数据回滚
3. 无 API 变更，前端无感知

## Design Overview

### 1. 模型配置复用

```typescript
// src/server/service/reportService.ts
private async getModelConfig(modelSlug?: string): Promise<{
  apiKey: string;
  baseUrl: string;
  modelSlug: string;
}> {
  // 复用 chatModelOpenAI 的模型解析逻辑
  // 但不创建 ChatOpenAI 实例，而是提取配置参数
  const account = await authService.getCurrentUserAccount();
  const accountId = parseInt(account.id);
  
  let config;
  if (modelSlug) {
    config = await modelProviderResolver.getActiveModelConfig(accountId, modelSlug);
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

### 2. 工作区管理

```typescript
// src/server/lib/reportWorkspace.ts
export class ReportWorkspaceManager {
  private workspaceRoot: string;
  
  constructor() {
    this.workspaceRoot = path.join(getProjectRoot(), 'temp', 'report-generation');
  }
  
  async createWorkspace(reportId: string, reportData: WeeklyReportData): Promise<string> {
    const workDir = path.join(this.workspaceRoot, reportId);
    await fs.mkdir(workDir, { recursive: true });
    
    // 写入数据文件
    await fs.writeFile(
      path.join(workDir, 'context.md'),
      this.buildContextFile(reportData)
    );
    await fs.writeFile(
      path.join(workDir, 'positions.json'),
      JSON.stringify(reportData.enrichedPositions, null, 2)
    );
    // ... 其他文件
    
    return workDir;
  }
  
  async cleanup(reportId: string): Promise<void> {
    const workDir = path.join(this.workspaceRoot, reportId);
    await fs.rm(workDir, { recursive: true, force: true });
  }
  
  private buildContextFile(reportData: WeeklyReportData): string {
    // 将报告数据转换为 Markdown 格式，便于 Agent 读取
    return `
# 报告生成上下文

## 账户业绩
${this.buildPerformanceSection(reportData.performance)}

## 持仓详情
${this.buildPositionsSection(reportData.enrichedPositions)}

## 数据来源
${this.buildDataSourceSection(reportData.dataSourceSummary)}
    `.trim();
  }
}
```

### 3. Agent 执行参数

```typescript
// systemPrompt
const systemPrompt = `
你是一位专业的投资顾问，负责生成投资周报。

## 数据来源
- context.md: 账户业绩和持仓摘要
- positions.json: 持仓明细（含实时行情）
- transactions.json: 本周交易记录
- notes.json: 用户投资笔记
- market-events.json: 本周市场关键事件

## 工具使用指南
- Read: 读取数据文件和历史报告
- Grep: 搜索笔记中的关键词
- WebSearch: 搜索最新新闻和市场信息
- Bash: 执行数据分析脚本（如计算波动率、相关性）

## 输出要求
- 格式：Markdown，包含以下章节：
  1. 市场与账户概览（本周收益率、与基准对比）
  2. 持仓异动分析（各持仓盈亏、风险变化）
  3. 信息与笔记回顾
  4. 下周展望与建议
- 语气：专业、客观、数据驱动
- 注意：如果数据时效性分数低于 0.5，请在报告中提示
`.trim();

// allowedTools
const allowedTools = [
  "Read",       // 读取数据文件
  "Glob",       // 查找文件
  "Grep",       // 搜索内容
  "WebSearch",  // 搜索新闻
  "Bash",       // 执行分析脚本
];
```

### 4. 迁移计划

#### 阶段 1：基础集成（1-2天）
- 添加 `@anthropic-ai/claude-agent-sdk` 依赖
- 实现 `ReportWorkspaceManager`
- 实现 `getModelConfig()` 方法
- 修改 `generateAIReportContent()` 使用 Claude Agent SDK

#### 阶段 2：测试验证（1天）
- 单元测试：工作区创建/清理
- 集成测试：完整报告生成流程
- 质量对比：与 LangChain Agent 生成的报告对比

#### 阶段 3：优化增强（1天）
- 添加历史报告对比分析能力
- 添加数据分析脚本（波动率、相关性计算）
- 性能优化：缓存工作区数据

### 5. 安全考虑

- **文件访问隔离**：`cwd` 限制在 `temp/report-generation/{reportId}/`，Agent 无法访问项目其他文件
- **命令执行限制**：仅允许执行分析脚本，禁止系统命令（rm、sudo 等）
- **成本限制**：`maxBudgetUsd` 防止超额消费
- **超时保护**：`maxTurns` 防止死循环

### 6. 性能优化

- **工作区缓存**：多次生成时可复用数据文件（除非数据变更）
- **流式返回**：虽然 SDK 支持流式，但报告生成场景不需要（直接等待最终结果）
- **并发控制**：限制同时生成报告的数量（通过队列管理）
