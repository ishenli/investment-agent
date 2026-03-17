# Change: Add Memory Management for Investment AI Assistant

## Why

当前应用在对话过程中缺乏持久的记忆能力，AI 无法记住用户的投资偏好、持仓策略、风险承受能力等关键信息。这导致每次对话都像是第一次接触用户，无法提供个性化的投资建议。需要添加记忆管理系统，让 AI 能够在对话中自动更新记忆，用户也可以手动管理记忆。

## Memory Architecture

本功能采用双层记忆架构：

### 1. 短期记忆（User-Level, 3 Days）
- **实现方式**：Claude Agent SDK Hooks + 工作区 Markdown 文件
- **存储位置**：`.investment-agent/memory/users/{userId}/` 目录
- **用途**：
  - 用户最近3天内的对话上下文
  - AI 提取的用户偏好即时存储
  - 通过 SDK hooks 自动捕获和更新
- **生命周期**：自动清理超过3天的记忆
- **粒度**：用户级别，非会话级别

### 2. 长期记忆（Persistent）
- **实现方式**：SQLite 数据库（Drizzle ORM）
- **存储位置**：`memories` 表
- **用途**：
  - 用户手动添加的记忆
  - 需要跨会话保留的记忆
  - 投资相关的结构化信息
- **生命周期**：永久保存，用户可管理

## What Changes

- 新增记忆数据库表结构（长期记忆）
- 新增短期记忆工作区目录和 markdown 文件管理
- 新增 Claude Agent SDK Hook 实现（自动记忆提取）
- 新增记忆管理 API 接口（CRUD 操作）
- 新增记忆管理服务层，处理两种记忆的同步
- 新增记忆检索机制，在对话中自动注入相关记忆
- 新增用户手动管理记忆的 UI 界面

## Impact

- 影响 specs: 新增 `memory-management` capability
- 影响代码:
  - `drizzle/schema.ts` - 新增 memories 表（长期记忆）
  - `src/server/repository/memoryRepository.ts` - 新增
  - `src/server/service/memoryService.ts` - 新增
  - `src/server/core/claude/memoryHooks.ts` - 新增（SDK Hooks）
  - `src/app/api/memory/route.ts` - 新增
  - `src/app/store/memory/` - 新增
  - `src/app/(pages)/settings/memory/` - 新增页面
  - `src/server/core/claude/claudeClient.ts` - 修改（集成 hooks）
  - `.investment-agent/memory/` - 短期记忆存储目录