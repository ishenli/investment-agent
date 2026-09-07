# 实现计划：移除 DeepAgents 引擎，简化内置 Agent 引擎体系

**分支**：`sc-frozen-cuprate-7f31` | **日期**：2026-09-03 | **规范**：`openspec/specs/{chat-api,agent-evaluation,skills-management}`

## 概要

移除 `deepagents` 引擎及其专属生态（npm 依赖、engine 实现、`/api/chat/agent` 路由、前端选项、评测适配器），聊天默认引擎收敛为 `hermes`。**保留**`langchain/` 子树中在用分析的 LangGraph 工作流与 `@langchain/*` 依赖，仅清理其中的 `deepagents` npm 直接引用。

## 技术上下文

**语言/版本**：TypeScript 5+ / Node.js >= 20；**主要依赖**：Next.js 16, React 19, Claude Agent SDK, hermes-agent（pi-ai）, LangChain/LangGraph, Drizzle ORM；**测试**：Vitest；**目标平台**：桌面 Web (Electron + Web)

## 关键事实（调研结论）

| 事实 | 位置 |
|------|------|
| `deepagents` 是前端聊天**默认回退引擎**，非 claude/hermes 均落到 `/api/chat/agent` | `src/app/services/chat.ts:662-668` |
| `deepagents` npm 仅两处使用：investmentAdvisorAgent 引擎本体 + `aiInsightsGraph.ts:9`（一处节点，可用 `llm.invoke` 替代，原注释已预留） | `src/server/core/agents/langchain/**` |
| `langchain/` 子树承载在用 LangGraph 功能（AI 洞察/分散投资/市场 AI/交易决策），**不在移除范围** | `aiInsightsService.ts` / `marketAIService.ts` / `stockService.ts` / `sseEmitter.ts` / `finnhubUtil.ts` |
| `langgraph.json` 指向的 deepagents 路径早已失效；`langgraph:dev/start` 脚本仅服务 DeepAgents CLI | `langgraph.json`、`package.json` |
| server 端 `chatService.ts` 无消费方（死代码），其测试同样删除 | `src/server/service/chatService.ts` |
| 评测含 `DeepAgentsAdapter`、`evaluationEngines` 的 deepagents、`EvalConfigPanel` 选项 | `packages/evaluation/**`、`EvalConfigPanel.tsx` |

## 代码变更蓝图

```text
删除：
  src/server/core/agents/langchain/engine.ts        # DeepAgentsEngine
  src/server/core/agents/langchain/deepagents/      # investmentAdvisorAgent
  src/app/api/chat/agent/                           # 路由
  src/server/service/chatService.ts (+ test)        # 死代码
  langgraph.json
  package.json: deepagents / @langgraph/langgraph-cli / langgraph:* 脚本
修改：
  src/server/core/engine/{types,index}.ts           # ENGINE_TYPES → [claude,hermes]
  aiInsightsGraph.ts                                # createDeepAgent → llm.invoke
  src/types/agent/index.ts                          # ENGINE_TYPES 收敛
  src/app/services/chat.ts                          # 默认引擎 hermes，端点只留 claude/hermes
  src/app/store/session/.../selectors/list.ts       # deepagents → hermes 归一
  ChatInput/ActionBar/{Engine,Tools,PermissionLevel,ClaudeMode}  # 去 deepagents
  packages/evaluation/src/**                        # 去 DeepAgentsAdapter / deepagents 枚举
  src/app/(pages)/setting/evaluation/.../EvalConfigPanel.tsx
  src/locales/*/setting.json                        # 去 deepagents 文案

保留（在用功能）：
  src/server/core/agents/langchain/{graphs,nodes,tools,provider,utils}
  deps: langchain / @langchain/core / @langchain/langgraph / @langchain/openai
```

## 数据流（目标态）

```
[chat] → engineType || 'hermes' → /api/chat/{claude,hermes} → runEngine → SSE
[存量 deepagents 会话] → 读取层归一为 hermes → 同上
```

## 复杂性与风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| 存量会话 `engineType='deepagents'` 落到死路由 | 中 | `services/chat.ts` 端点只剩 claude/hermes；`list.ts` selector 归一 |
| `aiInsightsGraph` 移除 createDeepAgent 后行为变化 | 低 | 该节点原本就留有 `llm.invoke` 注释，替换逻辑一致 |
| 依赖清理后 pnpm 树异常 | 中 | 清理后 `pnpm install` + `tsc --noEmit` + vitest 全量回归 |

## 测试策略

- 类型/单测/lint：`tsc --noEmit`、`pnpm test`、`pnpm -w run lint`
- 残留扫描：`grep -rn "deepagents|investmentAdvisorAgent|api/chat/agent" src electron packages`（仅剩说明注释）
- 冒烟：hermes/claude 会话各一条；`pnpm eval --compare claude,hermes`