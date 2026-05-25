# Change: Add Independent Task Management System

> **Change ID**: `add-task-management`  
> **Date**: 2026-05-25  
> **Author**: AI Assistant  
> **Status**: Draft (Pending Review)

## Why

当前投资 Agent 生成的投资建议散落在聊天消息中，缺乏一个闭环的「建议 → 行动」跟踪机制。调研完平台的工具系统后（28 个业务工具 + 6 个内置工具），团队发现用户在 AI 对话中获得关键建议后，很快就会遗忘或失去跟进行动力。因此需要一个独立的任务系统，将 AI 投资建议自动或手动转化为可追踪、可执行、可度量的任务项。

## What Changes

- **新增 `task-management` Capability**：独立的任务系统，包含数据模型、API、前端页面
- **新增 `tasks` 表**：定义任务状态流转、投资特有字段（触发条件、关联资产、来源追踪）
- **新增 Task 页面**：`/tasks` 路由，支持看板/列表视图、状态拖拽、搜索筛选
- **新增 Task API**：`GET/POST/PUT/DELETE /api/tasks` 完整 CRUD
- **集成到 Agent Chat**：Agent 在对话中可以建议创建任务，用户一键确认
- **自动过期机制**：超过截止日期的任务自动标记为 `expired`
- **（Phase 2）价格触发器**：条件型任务（如「特斯拉跌破 $200 时执行」）的闭环处理

### 不在本次范围内的未来扩展
- 与 Apple Reminders / 飞书的第三方同步
- 自动化任务调度（cron 式检查价格触发条件）
- 任务团队共享与指派

## Impact

- **新增 Specs**:
  - `specs/task-management/spec.md` — 全新 capability
- **修改 Specs**:
  - `specs/agent-management/spec.md` — Agent 需支持任务创建建议
  - `specs/chat-api/spec.md` — 聊天 API 需透传任务上下文
- **受影响代码区域**:
  - `drizzle/schema.ts` — 新增 `tasks` 表
  - `src/server/controller/` — 新增 `taskController.ts`
  - `src/app/api/` — 新增 `src/app/api/tasks/route.ts`
  - `src/app/(pages)/` — 新增 `/tasks` 页面
  - `src/server/core/agents/` — Agent 工具集新增 `task_create` / `task_list` / `task_update`
- **Schema 版本**：新增 1 个表 + 3 个索引，向后兼容，无破坏性变更

## 边界与术语

| 术语 | 定义 |
|------|------|
| 任务（Task） | 由用户手动创建或 AI 建议生成的投资行动项 |
| 条件型任务 | 绑定触发价格/条件的任务（价格触发器），Phase 2 支持 |
| 到期日任务 | 绑定截止日期的任务，超期自动 `expired` |
| 来源（Source） | 标识任务的创建上下文：`agent_chat` / `analysis_report` / `manual` |
