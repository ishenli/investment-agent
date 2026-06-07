# chat-storage Specification

## Purpose
TBD - created by archiving change migrate-chat-storage-sqlite. Update Purpose after archive.
## Requirements
### Requirement: Chat Session Storage

系统 MUST 提供聊天会话的持久化存储，支持会话的创建、查询、更新和删除操作。

#### Scenario: 创建聊天会话

- **GIVEN** 用户已登录系统
- **WHEN** 用户创建新的聊天会话
- **THEN** 系统 MUST 在 `chat_sessions` 表中创建新记录
- **THEN** 记录 MUST 包含用户 ID、会话 ID、配置和元数据
- **THEN** 系统 MUST 返回创建的会话对象

#### Scenario: 查询用户会话列表

- **GIVEN** 用户已登录系统
- **WHEN** 用户请求会话列表
- **THEN** 系统 MUST 返回该用户的所有会话
- **THEN** 结果 MUST 按更新时间倒序排列
- **THEN** 每个会话 MUST 包含关联的话题数量

#### Scenario: 更新会话配置

- **GIVEN** 用户拥有某个会话
- **WHEN** 用户更新会话配置（如模型、系统角色等）
- **THEN** 系统 MUST 更新 `chat_sessions` 表中对应记录的 `config` 字段
- **THEN** 系统 MUST 更新 `updated_at` 时间戳

#### Scenario: 删除会话

- **GIVEN** 用户拥有某个会话
- **WHEN** 用户删除该会话
- **THEN** 系统 MUST 删除 `chat_sessions` 表中的记录
- **THEN** 系统 MUST 级联删除关联的所有话题和消息

---

### Requirement: Chat Topic Storage

系统 MUST 提供聊天话题的持久化存储，支持会话内的话题分类管理。

#### Scenario: 创建话题

- **GIVEN** 用户拥有某个会话
- **WHEN** 用户在该会话中创建新话题
- **THEN** 系统 MUST 在 `chat_topics` 表中创建新记录
- **THEN** 记录 MUST 关联到正确的会话 ID

#### Scenario: 查询会话话题

- **GIVEN** 用户拥有某个会话
- **WHEN** 用户请求该会话的话题列表
- **THEN** 系统 MUST 返回该会话下的所有话题
- **THEN** 结果 MUST 包含每个话题的消息数量

#### Scenario: 删除话题

- **GIVEN** 用户拥有某个话题
- **WHEN** 用户删除该话题
- **THEN** 系统 MUST 删除 `chat_topics` 表中的记录
- **THEN** 系统 MUST 级联删除关联的所有消息

---

### Requirement: Chat Message Storage
系统 MUST 提供聊天消息的持久化存储，支持多角色消息、工具调用记录，以及助手消息中的结构化生成式 UI artifacts。

#### Scenario: 创建用户消息
- **GIVEN** 用户在某个话题中发送消息
- **WHEN** 系统保存用户消息
- **THEN** 系统 MUST 在 `chat_messages` 表中创建记录
- **THEN** 记录 MUST 包含 `role: 'user'` 和消息内容
- **THEN** 记录 MUST 关联到正确的会话和话题

#### Scenario: 创建助手消息
- **GIVEN** AI 助手生成回复
- **WHEN** 系统保存助手消息
- **THEN** 系统 MUST 在 `chat_messages` 表中创建记录
- **THEN** 记录 MUST 包含 `role: 'assistant'` 和回复内容
- **THEN** 记录 MUST 包含使用的模型和提供商信息
- **THEN** 如果回复包含生成式 UI，记录 MUST 持久化 `uiArtifacts`
- **THEN** 每个 `uiArtifacts` 条目 MUST 保留 `fallbackText`

#### Scenario: 保存工具调用消息
- **GIVEN** AI 调用工具执行操作
- **WHEN** 系统保存工具调用记录
- **THEN** 系统 MUST 在 `chat_messages` 表中创建记录
- **THEN** 记录 MUST 包含 `role: 'tool'`
- **THEN** 记录 MUST 包含工具调用信息（`tools`, `tool_call_id`）

#### Scenario: 分页查询消息
- **GIVEN** 用户查看某个话题的消息历史
- **WHEN** 系统加载消息列表
- **THEN** 系统 MUST 支持分页加载（默认每页 50 条）
- **THEN** 结果 MUST 按创建时间正序排列
- **THEN** 结果 MUST 排除已标记为删除的消息
- **THEN** 包含生成式 UI 的助手消息 MUST 返回已持久化的 `uiArtifacts`

#### Scenario: 更新消息内容
- **GIVEN** 用户需要修改已发送的消息
- **WHEN** 用户更新消息内容
- **THEN** 系统 MUST 更新 `chat_messages` 表中对应的文本内容
- **THEN** 系统 MUST 更新 `updated_at` 时间戳
- **THEN** 如果更新请求包含 `uiArtifacts`，系统 MUST 重新校验后再持久化

#### Scenario: 历史纯文本消息兼容
- **GIVEN** 历史消息记录没有 `uiArtifacts`
- **WHEN** 系统查询并返回消息
- **THEN** 系统 MUST 返回正常的 `content`
- **THEN** 系统 MUST 将缺失的 `uiArtifacts` 视为 undefined 或空数组
- **THEN** 系统 MUST NOT 要求迁移历史消息才能展示聊天记录

### Requirement: Chat Thread Storage

系统 MUST 提供消息线程的持久化存储，支持消息分支和线程化对话。

#### Scenario: 创建消息线程

- **GIVEN** 用户基于某条消息创建分支对话
- **WHEN** 系统创建新线程
- **THEN** 系统 MUST 在 `chat_threads` 表中创建记录
- **THEN** 记录 MUST 关联到源消息 ID
- **THEN** 记录 MUST 支持线程嵌套（`parent_thread_id`）

#### Scenario: 查询活跃线程

- **GIVEN** 用户查看某个话题的线程列表
- **WHEN** 系统加载线程
- **THEN** 系统 MUST 返回状态为 `active` 的线程
- **THEN** 结果 MUST 按最后活跃时间排序

---

### Requirement: Chat File Storage

系统 MUST 提供聊天文件附件的持久化存储。

#### Scenario: 上传文件附件

- **GIVEN** 用户在消息中上传文件
- **WHEN** 系统保存文件
- **THEN** 系统 MUST 在 `chat_files` 表中创建记录
- **THEN** 对于小文件（< 1MB），系统 MUST 以 base64 格式存储
- **THEN** 对于大文件，系统 MUST 存储 URL 引用

#### Scenario: 查询消息文件

- **GIVEN** 消息包含文件附件
- **WHEN** 系统加载消息详情
- **THEN** 系统 MUST 返回关联的文件列表
- **THEN** 每个文件 MUST 包含名称、类型和大小信息

---

### Requirement: Data Isolation

系统 MUST 确保用户数据隔离，用户只能访问自己的聊天数据。

#### Scenario: 用户认证检查

- **GIVEN** 用户请求访问聊天数据
- **WHEN** API 处理请求
- **THEN** 系统 MUST 验证用户身份
- **THEN** 未认证用户 MUST 收到 401 错误

#### Scenario: 数据所有权验证

- **GIVEN** 用户请求访问特定会话
- **WHEN** 系统查询数据
- **THEN** 系统 MUST 验证会话属于当前用户
- **THEN** 非所有者 MUST 收到 403 错误

---

### Requirement: Cascading Delete

系统 MUST 支持级联删除，确保数据完整性。

#### Scenario: 删除会话级联删除话题

- **GIVEN** 用户删除会话
- **WHEN** 执行删除操作
- **THEN** 系统 MUST 先删除关联的所有话题
- **THEN** 删除 MUST 在同一事务中完成

#### Scenario: 删除话题级联删除消息

- **GIVEN** 用户删除话题
- **WHEN** 执行删除操作
- **THEN** 系统 MUST 先删除关联的所有消息和线程
- **THEN** 删除 MUST 在同一事务中完成

