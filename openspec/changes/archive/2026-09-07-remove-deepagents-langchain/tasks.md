# 任务：移除 DeepAgents 引擎，简化内置 Agent 引擎体系

**输入**：`openspec/changes/remove-deepagents-langchain/specs/` 下 spec delta
**前置条件**：plan.md（必需）
**测试**：类型检查 `npm run types:check`；单元测试 `npm test`；lint `npm run lint`

**组织方式**：任务按阶段分组，支持增量交付与独立验证。`[P]` 为可并行任务。

## 第1阶段：移除 DeepAgents 引擎（✓ 已完成）

- [x] T10 引擎类型收敛：`src/server/core/engine/types.ts` 中 `ENGINE_TYPES`/`EngineType` → `['claude','hermes']`，删除 `DeepAgentsEngineExtra`
- [x] T11 `src/server/core/engine/index.ts` 移除 `deepagents` 注册/import/export
- [x] T12 删除 `src/server/core/agents/langchain/engine.ts`（DeepAgentsEngine）
- [x] T13 删除 `src/server/core/agents/langchain/deepagents/`（investmentAdvisorAgent）
- [x] T14 删除 `src/app/api/chat/agent/` 路由
- [x] T15 `src/types/agent/index.ts`：`ENGINE_TYPES` 收敛为 `['claude','hermes']`，默认值注释改为 hermes

## 第2阶段：清理 deepagents npm 引用（✓ 已完成）

- [x] T20 `aiInsightsGraph.ts` 中 `createDeepAgent` 一处改为 `this.llm.invoke`，移除 `deepagents` import

## 第3阶段：前端引擎收敛（✓ 已完成）

- [x] T30 `src/app/services/chat.ts`：默认 `engineType || 'hermes'`，端点仅保留 `/api/chat/claude` 与 `/api/chat/hermes`
- [x] T31 `src/app/store/session/slices/session/selectors/list.ts`：`currentSessionEngineType` 将缺失/存量 `deepagents` 归一为 `hermes`
- [x] T32 `ChatInput/ActionBar/Engine/index.tsx`：移除 DeepAgents 选项，`defaultValue="hermes"`
- [x] T33 `ChatInput/ActionBar/Tools/index.tsx`：移除 DeepAgents 专用 PluginsTools 分支，统一渲染 SkillsTools
- [x] T34 `PermissionLevel/index.tsx` / `ClaudeMode/index.tsx`：改用归一化 `sessionSelectors.currentSessionEngineType`，默认不再 fallback 到 deepagents
- [x] T35 清理 `Tools/useControls.tsx` 中已死的 `PluginToolItem`/`usePluginsControls`（DeepAgents plugins 工具组）

## 第4阶段：评测包清理（✓ 已完成）

- [x] T40 `packages/evaluation/src/adapters/engine-adapter.ts`：删除 `DeepAgentsAdapter` 与其 switch 分支
- [x] T41 `packages/evaluation/src/core/types.ts`：`evaluationEngines` → `['mock','claude','hermes']`
- [x] T42 `packages/evaluation/src/index.ts` / `core/web-api-runner.ts`：移除 deepagents 导出与 `/api/chat/agent` 端点分支
- [x] T43 `packages/evaluation/src/cli/index.ts`：`--compare` 示例改为 `claude,hermes`
- [x] T44 `EvalConfigPanel.tsx` 与 `locales/*/setting.json`：移除 deepagents 引擎选项与文案

## 第5阶段：依赖与死代码清理（✓ 已完成）

- [x] T50 删除 `langgraph.json`
- [x] T51 `package.json`：移除 `deepagents`、`@langgraph/langgraph-cli` 依赖与 `langgraph:dev`/`langgraph:start` 脚本
- [x] T52 删除无消费方的 `src/server/service/chatService.ts` 及其测试
- [x] T53 `pnpm install` 更新 lockfile（确认 deepagents / @langgraph/langgraph-cli 移除）

## 第6阶段：质量保证（✓ 已完成）

- [x] T60 `pnpm types:check`（根 + packages/evaluation）通过
- [x] T61 `pnpm test` 通过（905 passed / 8 skipped）
- [x] T62 `pnpm -w run lint`：改动文件无 error（仅有既有 warning）
- [x] T63 残留扫描：`deepagents|investmentAdvisorAgent|api/chat/agent` 仅剩说明注释

## 第7阶段：收尾

- [x] T70 更新 proposal.md / plan.md / tasks.md 至修正后范围（保留 langchain/LangGraph 在用功能）
- [x] T71 移除不再适用的 `specs/report-generation` 与 `specs/scheduled-tasks` delta
- [x] T72 运行 `openspec validate remove-deepagents-langchain --strict`
- [x] T80 更新 REFACTORING_PLAN.md 状态表（deepagents 标记已移除）

---

## 依赖关系

- 第1阶段（引擎层）→ 第2阶段（npm 引用）独立可并行；均须在第5阶段依赖清理与第6阶段 QA 之前完成
- 第3、4、5 阶段相互独立，可并行
- 第6阶段 QA 依赖其余全部阶段