# conversation-settings Specification

## Purpose
提供对话相关的可配置开关，让用户在不改代码的前提下控制 AI 对话功能的启用与关闭，当前包含 AI 追问提示开关。

## Requirements
### Requirement: 对话设置页提供 AI 追问提示开关
系统 MUST 在 settings 模块提供「对话设置」页面，该页面包含 AI 追问提示(AI 相关追问建议)的开关。开关状态按账户持久化，复用既有设置 API(`GET /api/setting` 读取、`PUT /api/setting` 写入)，键名为 `CHAT_AI_TIPS_ENABLED`。未配置任何账户值时系统 MUST 将该功能视为开启。

#### Scenario: 读取开关当前状态
- **GIVEN** 用户已在设置页打开「对话设置」
- **WHEN** 设置页加载
- **THEN** 系统 MUST 展示 AI 追问提示开关
- **AND** 开关状态 MUST 反映该账户 `CHAT_AI_TIPS_ENABLED` 的当前值
- **AND** 未被设置过时显示为开启

#### Scenario: 切换开关并持久化
- **GIVEN** 用户在「对话设置」页操作 AI 追问提示开关
- **WHEN** 开关被切换
- **THEN** 系统 MUST 通过设置 API 将该账户的 `CHAT_AI_TIPS_ENABLED` 更新为对应值
- **AND** 后续请求 MUST 读取到更新后的值

### Requirement: 对话设置状态校验
设置 API MUST 只接受白名单内的设置键，`CHAT_AI_TIPS_ENABLED` 必须纳入既有 SettingKeySchema 枚举；非法键 MUST 被拒绝并返回校验错误，不写入数据库。

#### Scenario: 白名单外的键被拒绝
- **GIVEN** 客户端向设置 API 提交一个不在白名单中的键
- **WHEN** API 校验请求体
- **THEN** 系统 MUST 返回校验错误
- **AND** MUST NOT 将该键写入账户设置

#### Scenario: 合法键正常写入
- **GIVEN** 客户端提交 `CHAT_AI_TIPS_ENABLED` 及其合法值
- **WHEN** API 校验请求体
- **THEN** 系统 MUST 校验通过
- **AND** 将值持久化到该账户设置