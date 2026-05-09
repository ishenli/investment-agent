# Change: Add Memory Management for Investment AI Assistant

## Why

当前应用在对话过程中缺乏持久的记忆能力，AI 无法记住用户的投资偏好、持仓策略、风险承受能力等关键信息。这导致每次对话都像是第一次接触用户，无法提供个性化的投资建议。需要添加记忆管理系统，让 AI 能够在对话中自动更新记忆，用户也可以手动管理记忆。

## Memory Architecture

本功能采用双层记忆架构：

### 1. 短期记忆（User-Level, 3 Days）
- **实现方式**：Claude Agent SDK Hooks + 工作区 Markdown 文件
- **存储位置**：Claude Agent 默认工作区目录下 `memory/users/{userId}/`
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

## 记忆自动提取（渐进式）

记忆提取是渐进式的——随着对话积累，助理会越来越了解你。每一次深入的对话都是助理捕捉和存储有价值信息的机会。

### 提取时机

- **对话结束后**：通过 `postModelTurn` Hook 触发，AI 判断本轮对话是否有值得记录的信息
- **首次提取时机**：用户发送至少 3 条消息后，开始正式提取
- **增量更新**：每次提取仅新增或更新变化的部分，不重复写入已有记忆

### 提取内容

AI 自动识别并提取以下类型的信息写入短期记忆文件：

| 类别 | 示例 |
|------|------|
| 投资偏好 | 风险承受能力、偏好行业、投资风格 |
| 持仓策略 | 仓位管理习惯、止损逻辑、加仓条件 |
| 关注标的 | 用户正在跟踪的股票、ETF、资产 |
| 个人背景 | 投资经验年限、主要市场、资金量级 |
| 近期关注点 | 当前感兴趣的市场主题或事件 |

### 渐进式积累机制

```
第1-2次对话  →  基础偏好轮廓初始化
第3-10次对话 →  偏好细化，捕捉持仓逻辑
第10+次对话  →  深层策略提炼，个性化建议质量显著提升
```

- 短期记忆文件随对话滚动更新，保留最近 3 天的提取结果
- 助理会将高价值信息（如明确表达的策略偏好）自动晋升为长期记忆

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
  - Claude Agent 默认工作区 `memory/` - 短期记忆存储目录