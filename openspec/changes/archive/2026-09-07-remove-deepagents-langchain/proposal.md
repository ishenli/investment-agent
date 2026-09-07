# Change: 移除 DeepAgents 引擎，简化内置 Agent 引擎体系

## Why

系统内置三套 Agent 引擎（DeepAgents / Claude / Hermes）。DeepAgents 基于 `deepagents` npm，是三者中唯一依赖过期 SDK、且与 Claude/Hermes 功能重叠的一套。保留它意味着维护第三套引擎协议、独立的路由与 UI 选项、单独的评测适配器，与「简化系统内置」的目标相悖。**注意：`langchain/` 子树里的 LangGraph 工作流（AI 洞察、分散投资、市场分析、交易决策等）是在用功能，不属于本次移除范围**，相关 `@langchain/*` 依赖予以保留。

## What Changes

- **移除 DeepAgents 引擎**：`src/server/core/engine/types.ts` 中 `EngineType`/`ENGINE_TYPES` 收敛为 `['claude','hermes']`，删除 `DeepAgentsEngineExtra`；`engine/index.ts` 去掉 `deepagents` 注册与导出；删除 `src/server/core/agents/langchain/engine.ts`（DeepAgentsEngine）与 `langchain/deepagents/`（investmentAdvisorAgent）。
- **删除 `/api/chat/agent` 路由**（聊天前端不再有任何 deepagents 端点）。
- **前端引擎收敛**：聊天默认引擎由 `'deepagents'` 改为 `'hermes'`；Engine 选择器移除 DeepAgents 选项；Tools 面板移除 DeepAgents 专用 plugins 分支（统一 skills）；`PermissionLevel`/`ClaudeMode`/`sessionSelectors` 的 `engineType || 'deepagents'` 默认改为 hermes。
- **存量会话兜底**：`sessionSelectors.currentSessionEngineType` 与 `services/chat.ts` 将 `deepagents`（或缺失）归一为 `hermes`，无需 DB 迁移。
- **清理 `deepagents` npm 依赖**：`aiInsightsGraph.ts` 里唯一一处 `createDeepAgent` 改为 `llm.invoke`（该处原注释本就预留了此写法），随后移除 `package.json` 中的 `deepagents`。
- **移除 langgraph 开发工具链**：删除 `langgraph.json`（路径早已失效）与 `package.json` 中的 `langgraph:dev`/`langgraph:start` 脚本、`@langgraph/langgraph-cli` 依赖。
- **评测包**：移除 `DeepAgentsAdapter`、`evaluationEngines` 中的 `'deepagents'`、评测配置面板的 deepagents 选项、CLI 示例（**BREAKING**）。
- **清理死代码**：删除无任何消费方的 server 端 `chatService.ts` 与其测试（其 langgraph 图能力经 `aiInsightsService`/`marketAIService`/`stockService` 等在用服务承载）。
- **spec 同步**：chat-api 移除 DeepAgents 需求并修订投资顾问/聊天集成与默认引擎路由；agent-evaluation、skills-management 移除 deepagents 引用。
- **保留**：`src/server/core/agents/langchain/` 其余部分（graphs / nodes / tools / provider / utils 等在用 LangGraph 功能）及 `langchain`、`@langchain/core`、`@langchain/langgraph`、`@langchain/openai` 依赖。

## Impact

- Affected specs: `chat-api`(REMOVED×4 + MODIFIED×3 + ADDED×1)、`agent-evaluation`(MODIFIED×2)、`skills-management`(MODIFIED×1)
- Affected code: `src/server/core/engine/`、`src/server/core/agents/langchain/{engine,deepagents}`、`src/app/api/chat/agent/`、`src/app/services/chat.ts`、`src/types/agent/index.ts`、`src/app/store/session/.../selectors/list.ts`、chat 前端 `ChatInput/ActionBar/*`、`src/server/core/agents/langchain/graphs/aiInsightsGraph.ts`、`src/server/service/chatService.ts`（删）、`packages/evaluation/`、`package.json`、`langgraph.json`（删）
- **BREAKING**:
  - chat 请求 `engineType='deepagents'` 不再被识别；存量会话读取时归一为 `hermes`
  - 评测命令 `pnpm eval --compare deepagents,...` 不再支持（仅 Claude/Hermes）
  - `/api/chat/agent` 端点移除

## Out of Scope

- LangGraph 分析功能（AI 洞察 / 分散投资 / 策略建议 / 市场 AI / 交易决策）与 `@langchain/*` 依赖**不在移除范围**，仅清理其中对 `deepagents` npm 的直接引用
- 报告生成 `agentType`、`/api/chat/llm`、评测的 `mock` 引擎等均不在本次变更范围
- DB schema 无需变更（`engineType` 兜底在读取层处理）