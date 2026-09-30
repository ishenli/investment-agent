# Change: 每日洞察改为会话式定时任务执行

## Why
当前 `jobType = "insight"` 的定时任务通过 `executeInsightJob` 调用 `AIInsightsService.generateAIInsights`，
其提示词硬编码在 `aiInsightsGraph.ts` 源码中，且每次执行复用相同流程，导致每日洞察内容高度重复、用户无法按任务定制分析重点。
用户希望在洞察类定时任务中通过 `config.instructions` 定制每次执行的提示词，并把每次执行视为一次全新的会话，
从而产生随提示词与数据变化而变化的、多样化的分析结果。

## What Changes
- **会话式执行**：`jobType = "insight"` 的定时任务不再走固定的 LangGraph 生成流程，改为复用 Agent 路径
  （`HermesEngine` headless），每次执行都创建一个**全新的会话**（persisted session），把 `config.instructions` 作为本轮用户提示词。
- **可定制提示词**：洞察类定时任务在创建/编辑时读取用户填写的 `config.instructions`，并将其作为该次执行的生成提示词，
  替代原先代码内硬编码的 `aiInsightsGraph` prompt。
- **会话持久化**：每次执行通过 `chatStorageService.createSession` 落库一个真实会话，执行产出通过 `chatStorageService.createMessage` 落为该会话的一条助手消息，
  与 `config.instructions` 的用户消息同会话保存，可回看该次洞察的完整对话上下文；`scheduledJobLogs.result` 记录 `sessionId` 与消息引用。
- **结果记录与通知**：保留现有执行日志记录与系统通知能力，通知中携带本次执行对应的会话/洞察入口。
- **BREAKING**：洞察类定时任务执行将不再使用 `AIInsightsService.generateAIInsights` 的结构化 JSON 洞察格式；
  改为 Agent 会话产生的分析文本。`ai_insights` 表中既往 `source = 'scheduled'` 的历史记录保留，不再新增。

## Impact
- 受影响的规范（capability）：`scheduled-tasks`
- 受影响的代码：
  - `src/server/service/jobExecutorService.ts` —— `executeInsightJob` 改用会话式 Agent 执行
  - `src/server/service/agentJobExecutor.ts` —— 扩展为支持洞察类型并持久化会话
  - `src/server/service/chatStorageService.ts` —— 创建新会话
  - `src/server/repository/chat/session.ts` —— 会话创建
  - `src/app/(pages)/insight/modules/InsightHistory.tsx` —— 洞察历史展示对齐（会话式输出）
  - 相关通知与日志服务
- 受影响的数据：`ai_insights` 表（只读历史，写入来源变更，新执行不再写入）；`chatSessions` 与 `chatMessages`（每次洞察执行新建会话并持久化产出）；洞察历史页对新旧两类记录做聚合展示