## MODIFIED Requirements

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
