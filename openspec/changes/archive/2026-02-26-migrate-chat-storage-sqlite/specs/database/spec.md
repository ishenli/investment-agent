# database Specification Delta

## MODIFIED Requirements

### Requirement: Table Schema

每个数据表 MUST 包含标准字段：id、created_at、updated_at。聊天相关表 MUST 使用 `chat_` 前缀命名。

#### Scenario: 标准表字段

- **WHEN** 创建新的数据表
- **THEN** 表 MUST 包含主键 `id` 字段
- **THEN** 表 MUST 包含 `created_at` 时间戳字段
- **THEN** 表 MUST 包含 `updated_at` 时间戳字段

#### Scenario: 聊天表命名规范

- **WHEN** 创建聊天相关的数据表
- **THEN** 表名 MUST 使用 `chat_` 前缀（如 `chat_sessions`, `chat_messages`）
- **THEN** 表 MUST 遵循 snake_case 命名规范

---

## ADDED Requirements

### Requirement: Chat Sessions Table

系统 MUST 提供 `chat_sessions` 表存储聊天会话数据。

#### Scenario: 表结构定义

- **WHEN** 数据库初始化
- **THEN** `chat_sessions` 表 MUST 包含以下字段：
  - `id` (TEXT, PRIMARY KEY) - 会话唯一标识
  - `user_id` (INTEGER, FK) - 所属用户
  - `slug` (TEXT, UNIQUE) - 会话 URL 标识
  - `type` (TEXT, ENUM) - 会话类型（agent/group）
  - `group_id` (TEXT, FK) - 所属分组
  - `pinned` (BOOLEAN) - 是否置顶
  - `config` (JSON) - Agent 配置
  - `meta` (JSON) - 会话元数据
  - `agent_id` (TEXT) - 关联的 Agent ID
  - `created_at` (INTEGER) - 创建时间
  - `updated_at` (INTEGER) - 更新时间

---

### Requirement: Chat Topics Table

系统 MUST 提供 `chat_topics` 表存储会话内的话题分类。

#### Scenario: 表结构定义

- **WHEN** 数据库初始化
- **THEN** `chat_topics` 表 MUST 包含以下字段：
  - `id` (TEXT, PRIMARY KEY) - 话题唯一标识
  - `session_id` (TEXT, FK) - 所属会话
  - `title` (TEXT) - 话题标题
  - `favorite` (BOOLEAN) - 是否收藏
  - `created_at` (INTEGER) - 创建时间
  - `updated_at` (INTEGER) - 更新时间

---

### Requirement: Chat Messages Table

系统 MUST 提供 `chat_messages` 表存储聊天消息记录。

#### Scenario: 表结构定义

- **WHEN** 数据库初始化
- **THEN** `chat_messages` 表 MUST 包含以下字段：
  - `id` (TEXT, PRIMARY KEY) - 消息唯一标识
  - `session_id` (TEXT, FK) - 所属会话
  - `topic_id` (TEXT, FK) - 所属话题
  - `parent_id` (TEXT, FK) - 父消息 ID
  - `role` (TEXT, ENUM) - 角色（user/system/assistant/tool）
  - `content` (TEXT) - 消息内容
  - `files` (JSON) - 关联文件列表
  - `favorite` (INTEGER) - 收藏状态
  - `user_like_tag` (TEXT, ENUM) - 用户评价
  - `error` (JSON) - 错误信息
  - `reasoning` (JSON) - 推理过程
  - `tools` (JSON) - 工具调用记录
  - `tool_call_id` (TEXT) - 工具调用 ID
  - `plugin` (JSON) - 插件信息
  - `plugin_state` (JSON) - 插件状态
  - `model` (TEXT) - 使用的模型
  - `provider` (TEXT) - 提供商
  - `trace_id` (TEXT) - 追踪 ID
  - `observation_id` (TEXT) - 观察 ID
  - `created_at` (INTEGER) - 创建时间
  - `updated_at` (INTEGER) - 更新时间

#### Scenario: 消息索引

- **WHEN** 数据库初始化
- **THEN** `chat_messages` 表 MUST 创建以下索引：
  - `(session_id, topic_id)` - 复合索引，用于查询会话话题下的消息
  - `(created_at)` - 用于按时间排序

---

### Requirement: Chat Threads Table

系统 MUST 提供 `chat_threads` 表存储消息线程。

#### Scenario: 表结构定义

- **WHEN** 数据库初始化
- **THEN** `chat_threads` 表 MUST 包含以下字段：
  - `id` (TEXT, PRIMARY KEY) - 线程唯一标识
  - `topic_id` (TEXT, FK) - 所属话题
  - `source_message_id` (TEXT, FK) - 源消息 ID
  - `parent_thread_id` (TEXT, FK) - 父线程 ID（自引用）
  - `title` (TEXT) - 线程标题
  - `type` (TEXT, ENUM) - 类型（continuation/standalone）
  - `status` (TEXT, ENUM) - 状态（active/deprecated/archived）
  - `last_active_at` (INTEGER) - 最后活跃时间
  - `created_at` (INTEGER) - 创建时间
  - `updated_at` (INTEGER) - 更新时间

---

### Requirement: Chat Files Table

系统 MUST 提供 `chat_files` 表存储文件附件。

#### Scenario: 表结构定义

- **WHEN** 数据库初始化
- **THEN** `chat_files` 表 MUST 包含以下字段：
  - `id` (TEXT, PRIMARY KEY) - 文件唯一标识
  - `message_id` (TEXT, FK) - 关联消息
  - `session_id` (TEXT, FK) - 关联会话
  - `name` (TEXT) - 文件名
  - `file_type` (TEXT) - 文件类型
  - `size` (INTEGER) - 文件大小
  - `save_mode` (TEXT, ENUM) - 存储模式（local/url）
  - `url` (TEXT) - 文件 URL
  - `data` (TEXT) - 文件数据（base64）
  - `metadata` (JSON) - 元数据
  - `created_at` (INTEGER) - 创建时间
  - `updated_at` (INTEGER) - 更新时间

---

### Requirement: Chat Session Groups Table

系统 MUST 提供 `chat_session_groups` 表存储会话分组。

#### Scenario: 表结构定义

- **WHEN** 数据库初始化
- **THEN** `chat_session_groups` 表 MUST 包含以下字段：
  - `id` (TEXT, PRIMARY KEY) - 分组唯一标识
  - `name` (TEXT) - 分组名称
  - `sort` (INTEGER) - 排序值
  - `created_at` (INTEGER) - 创建时间
  - `updated_at` (INTEGER) - 更新时间

---

### Requirement: Chat Plugins Table

系统 MUST 提供 `chat_plugins` 表存储插件设置。

#### Scenario: 表结构定义

- **WHEN** 数据库初始化
- **THEN** `chat_plugins` 表 MUST 包含以下字段：
  - `id` (TEXT, PRIMARY KEY) - 插件唯一标识
  - `identifier` (TEXT, UNIQUE) - 插件标识符
  - `type` (TEXT, ENUM) - 类型（plugin/customPlugin）
  - `manifest` (JSON) - 插件清单
  - `settings` (JSON) - 插件设置
  - `created_at` (INTEGER) - 创建时间
  - `updated_at` (INTEGER) - 更新时间

---

### Requirement: Foreign Key Relationships

系统 MUST 在聊天相关表之间建立正确的外键关系。

#### Scenario: 会话-用户关系

- **WHEN** 创建 `chat_sessions` 表
- **THEN** `user_id` MUST 引用 `users` 表的 `id`
- **THEN** 删除用户时 MUST 级联删除其所有会话

#### Scenario: 话题-会话关系

- **WHEN** 创建 `chat_topics` 表
- **THEN** `session_id` MUST 引用 `chat_sessions` 表的 `id`
- **THEN** 删除会话时 MUST 级联删除其所有话题

#### Scenario: 消息-会话/话题关系

- **WHEN** 创建 `chat_messages` 表
- **THEN** `session_id` MUST 引用 `chat_sessions` 表的 `id`
- **THEN** `topic_id` MUST 引用 `chat_topics` 表的 `id`
- **THEN** `parent_id` MUST 自引用 `chat_messages` 表的 `id`

#### Scenario: 线程自引用关系

- **WHEN** 创建 `chat_threads` 表
- **THEN** `parent_thread_id` MUST 自引用 `chat_threads` 表的 `id`
- **THEN** 这支持线程的嵌套结构