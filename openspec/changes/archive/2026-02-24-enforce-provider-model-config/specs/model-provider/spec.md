# Model Provider 配置管理规范

此 capability 定义模型配置管理的行为规范，确保所有 AI 模型调用统一使用用户配置的默认模型。

## ADDED Requirements

### Requirement: 默认模型获取

系统 SHALL 支持无参数调用 `chatModelOpenAI()` 获取用户的默认模型。

#### Scenario: 使用默认模型

- **GIVEN** 用户配置了默认模型
- **WHEN** 调用 `chatModelOpenAI()`
- **THEN** 系统 SHALL 返回用户的默认模型实例

#### Scenario: 无配置时使用环境变量

- **GIVEN** 用户未配置任何 Provider
- **WHEN** 调用 `chatModelOpenAI()`
- **THEN** 系统 SHALL fallback 到环境变量配置（`MODEL_PROVIDER_URL`, `MODEL_PROVIDER_API_KEY`）
- **AND** 系统 SHALL 记录警告日志建议配置 Provider

#### Scenario: 无任何配置时报错

- **GIVEN** 用户未配置 Provider 且无环境变量
- **WHEN** 调用 `chatModelOpenAI()`
- **THEN** 系统 SHALL 抛出明确的配置错误
- **AND** 错误消息 SHALL 指导用户如何配置 Provider

### Requirement: 指定模型回退

系统 SHALL 支持指定模型名称调用，当模型未配置时自动回退到默认模型。

#### Scenario: 指定模型存在

- **GIVEN** 用户配置了指定模型
- **WHEN** 调用 `chatModelOpenAI('Kimi-K2.5')`
- **THEN** 系统 SHALL 返回该模型实例

#### Scenario: 指定模型不存在时回退

- **GIVEN** 用户配置了默认模型
- **AND** 用户未配置指定模型 `'unknown-model'`
- **WHEN** 调用 `chatModelOpenAI('unknown-model')`
- **THEN** 系统 SHALL 返回用户的默认模型
- **AND** 系统 SHALL 记录警告日志指示使用了回退模型

### Requirement: 向后兼容性

系统 SHALL 保持向后兼容，支持直接传入模型名称字符串的调用方式。

#### Scenario: 字符串参数兼容

- **WHEN** 调用 `chatModelOpenAI('Kimi-K2.5')`
- **THEN** 系统行为与 `chatModelOpenAI()` 指定模型一致

### Requirement: 日志记录

系统 SHALL 在模型配置相关操作中记录适当的日志。

#### Scenario: 成功获取默认模型

- **WHEN** 成功从 Provider 配置获取默认模型
- **THEN** 系统 SHALL 记录 INFO 级别日志
- **AND** 日志 SHALL 包含模型 slug 和 Provider 名称

#### Scenario: 使用回退模型

- **WHEN** 由于模型未配置而使用回退
- **THEN** 系统 SHALL 记录 WARN 级别日志
- **AND** 日志 SHALL 包含原始请求的模型和实际使用的模型

#### Scenario: 使用环境变量 fallback

- **WHEN** 使用环境变量配置作为 fallback
- **THEN** 系统 SHALL 记录 WARN 级别日志
- **AND** 日志 SHALL 建议用户配置 Provider