# report-generation Spec Delta: Claude Agent SDK 集成

## MODIFIED Requirements

### Requirement: Structured AI Report Generation
系统 MUST 使用 Claude Agent SDK 或 LangChain 生成报告内容，支持通过 agentType 参数切换。

#### Scenario: Generate Report with Claude Agent SDK
- **GIVEN** 系统已完成数据聚合
- **WHEN** 系统调用 `generateAIReportContent(reportData, modelSlug)`
- **THEN** 系统 MUST 创建临时工作区目录 `temp/report-generation/{reportId}/`
- **THEN** 系统 MUST 将报告数据写入工作区文件：
  - `context.md` - 账户业绩和持仓摘要（Markdown 格式）
  - `positions.json` - 持仓明细（JSON 格式）
  - `transactions.json` - 交易记录（JSON 格式）
  - `notes.json` - 用户笔记（JSON 格式）
  - `market-events.json` - 市场事件（JSON 格式）
- **THEN** 系统 MUST 调用 Claude Agent SDK 的 `query()` 函数
- **THEN** SDK 配置 MUST 包含：
  - `apiKey` - 从 modelProviderResolver 获取
  - `baseURL` - 从 modelProviderResolver 获取
  - `model` - 模型标识（modelSlug）
  - `cwd` - 工作区路径
  - `allowedTools: ["Read", "Glob", "Grep", "WebSearch"]`
  - `permissionMode: "acceptEdits"`
  - `maxTurns: 20` - 限制执行轮次
  - `maxBudgetUsd: 0.5` - 限制单次成本
- **THEN** 系统 MUST 在报告生成完成后清理工作区目录
- **THEN** 输出 MUST 包含完整的 Markdown 格式报告

#### Scenario: Agent Workspace File Structure
- **GIVEN** Agent 需要读取报告数据
- **WHEN** 工作区创建完成
- **THEN** `context.md` MUST 包含账户业绩概览和持仓摘要（Markdown 格式）
- **THEN** JSON 文件 MUST 包含完整的结构化数据
- **THEN** Agent MUST 能够通过 Read 工具读取所有文件
- **THEN** Agent MUST 能够通过 Grep 工具搜索笔记内容

#### Scenario: Agent Tool Usage Guidance
- **GIVEN** Agent 执行报告生成任务
- **WHEN** Agent 调用工具
- **THEN** Agent 可使用 **Read** 工具读取数据文件
- **THEN** Agent 可使用 **Glob** 工具查找文件
- **THEN** Agent 可使用 **Grep** 工具搜索笔记关键词
- **THEN** Agent 可使用 **WebSearch** 工具搜索最新市场新闻
- **THEN** systemPrompt MUST 包含工具使用指南和分析原则

#### Scenario: Model Configuration Reuse
- **GIVEN** 系统需要获取模型配置
- **WHEN** 调用 `getModelConfig(modelSlug)` 方法
- **THEN** 系统 MUST 复用 `modelProviderResolver` 的逻辑
- **THEN** 如果指定模型不存在，系统 MUST 回退到默认模型
- **THEN** 返回配置 MUST 包含 `apiKey`、`baseUrl`、`modelSlug`

#### Scenario: Workspace Cleanup After Generation
- **GIVEN** 报告生成完成或失败
- **WHEN** `generateAIReportContent()` 方法执行结束
- **THEN** 系统 MUST 在 finally 块中调用 `workspaceManager.cleanup(reportId)`
- **THEN** 工作区目录 MUST 被递归删除
- **THEN** 如果删除失败，系统 MUST 记录警告但不抛出异常

#### Scenario: Agent Execution Budget Control
- **GIVEN** Agent 正在生成报告
- **WHEN** Token 消耗达到 `maxBudgetUsd` 限制
- **THEN** Claude Agent SDK MUST 停止执行
- **THEN** 系统 MUST 返回已生成的部分内容（如果有）
- **THEN** 系统 MUST 记录预算超限日志

#### Scenario: Agent Execution Turn Limit
- **GIVEN** Agent 正在生成报告
- **WHEN** 执行轮次达到 `maxTurns` 限制
- **THEN** Claude Agent SDK MUST 停止执行
- **THEN** 系统 MUST 返回最终结果（即使未完全完成）
- **THEN** 系统 MUST 记录轮次超限日志

#### Scenario: Backward Compatibility with Existing API
- **GIVEN** 前端调用 `POST /api/report` 接口
- **WHEN** 请求体包含 `accountId`、`type`、`modelSlug`（可选）
- **THEN** API 接口签名 MUST 保持不变
- **THEN** 响应格式 MUST 保持不变（reportId、status、content）
- **THEN** `analysis_reports` 表结构 MUST 保持不变
- **THEN** 生成的报告内容格式 MUST 与原有格式兼容（Markdown，相同章节结构）

---

## ADDED Requirements

### Requirement: Report Workspace Management
系统 MUST 提供工作区管理功能，用于 Agent 读取报告数据。

#### Scenario: Create Workspace
- **GIVEN** 系统需要生成报告
- **WHEN** 调用 `ReportWorkspaceManager.createWorkspace(reportId, reportData)`
- **THEN** 系统 MUST 创建目录 `{projectRoot}/temp/report-generation/{reportId}/`
- **THEN** 系统 MUST 写入 `context.md` 文件（包含业绩和持仓摘要）
- **THEN** 系统 MUST 写入 `positions.json` 文件（结构化持仓数据）
- **THEN** 系统 MUST 写入 `transactions.json` 文件（交易记录）
- **THEN** 系统 MUST 写入 `notes.json` 文件（用户笔记）
- **THEN** 系统 MUST 写入 `market-events.json` 文件（市场事件）
- **THEN** 系统 MUST 返回工作区路径

#### Scenario: Build Context File
- **GIVEN** 系统需要构建 context.md 文件
- **WHEN** 调用 `buildContextFile(reportData)`
- **THEN** 文件 MUST 包含账户业绩数据章节
- **THEN** 文件 MUST 包含持仓详情章节
- **THEN** 文件 MUST 包含数据来源信息章节
- **THEN** 文件 MUST 说明其他数据文件的用途
- **THEN** 格式 MUST 为 Markdown

#### Scenario: Cleanup Workspace
- **GIVEN** 报告生成完成或失败
- **WHEN** 调用 `ReportWorkspaceManager.cleanup(reportId)`
- **THEN** 系统 MUST 递归删除工作区目录
- **THEN** 如果删除失败（权限、文件占用等），系统 MUST 仅记录警告
- **THEN** 系统 MUST NOT 因清理失败而抛出异常

#### Scenario: Workspace Path Isolation
- **GIVEN** Agent 运行在工作区中
- **WHEN** Agent 尝试访问文件
- **THEN** Agent MUST 仅能访问 `cwd` 目录下的文件
- **THEN** Agent MUST NOT 能访问项目其他目录（如源码、数据库文件）

---

## REMOVED Requirements

None.

---

## RENAMED Requirements

None.

---

## Implementation Notes

### Claude Agent SDK 依赖

```json
{
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.2.x"
  }
}
```

### 工作区路径计算

```typescript
import { getProjectRoot } from '@/server/base/database/DatabaseManager';

const projectRoot = getProjectRoot();
const workspaceRoot = path.join(projectRoot, 'temp', 'report-generation');
```

### Agent systemPrompt 模板

```typescript
const systemPrompt = `
你是一位专业的投资顾问，负责分析投资数据并生成周报。

## 数据来源
- context.md: 账户业绩和持仓摘要
- positions.json: 持仓明细（含实时行情）
- transactions.json: 本周交易记录
- notes.json: 用户投资笔记
- market-events.json: 本周市场关键事件

## 工具使用指南
- Read: 读取数据文件
- Glob: 查找文件
- Grep: 搜索笔记中的关键词
- WebSearch: 搜索最新市场新闻和公司信息

## 分析原则
- 数据驱动：基于提供的持仓、交易、业绩数据
- 客观中立：不做主观推测，仅基于事实分析
- 风险提示：标注潜在风险和不确定性

## 输出要求
生成 Markdown 格式的报告，包含以下章节：
1. **市场与账户概览**：本周收益率、与基准对比
2. **持仓异动分析**：各持仓盈亏情况、风险变化
3. **信息与笔记回顾**：关键市场事件和用户笔记
4. **下周展望与建议**：投资策略建议

语气专业、客观。如果数据时效性分数低于 0.5，请在报告中提示。
`.trim();
```

### Agent 工具配置

```typescript
const allowedTools = [
  "Read",       // 读取文件内容
  "Glob",       // 文件查找（使用 glob 模式）
  "Grep",       // 内容搜索（使用正则）
  "WebSearch",  // Web 搜索
];
```

### 成本控制参数

```typescript
const options = {
  maxTurns: 20,         // 最多执行 20 轮，防止死循环
  maxBudgetUsd: 0.5,    // 单次报告最多花费 $0.5 (约 ¥3.5)
  permissionMode: "acceptEdits",  // 自动接受文件编辑（仅限工作区内）
};
```

### 回退方案

如果需要回退到 LangChain Agent：

1. 恢复 `generateAIReportContent()` 的原有实现
2. 删除 `ReportWorkspaceManager`
3. 移除 `@anthropic-ai/claude-agent-sdk` 依赖

原有代码已在注释中保留，回退成本低。
