## ADDED Requirements

### Requirement: AI 分析模型选择功能

用户在 StepTwoAIAnalyzer 组件中进行 AI 分析时 SHALL 能够选择要使用的模型。

#### Scenario: 显示模型选择器

- **GIVEN** 用户进入 StepTwoAIAnalyzer 步骤
- **WHEN** 组件加载完成
- **THEN** 系统 SHALL 显示模型选择下拉框
- **AND** 下拉框 SHALL 列出用户配置的所有可用模型
- **AND** 默认选中用户的默认模型

#### Scenario: 获取可用模型列表

- **GIVEN** StepTwoAIAnalyzer 组件初始化
- **WHEN** 组件获取可用模型列表
- **THEN** 系统 SHALL 调用 `GET /api/model-providers/models/available` 接口
- **AND** 接口返回用户配置的所有可用模型列表
- **AND** 每个模型 SHALL 包含 slug、name、providerName 等信息

#### Scenario: 选择模型进行分析

- **GIVEN** 用户已选择一个模型
- **WHEN** 用户点击"开始分析"按钮
- **THEN** 系统 SHALL 调用 `PUT /api/market-fetcher/ai` 接口
- **AND** 请求体 SHALL 包含 `modelSlug` 字段（用户选择的模型标识）
- **AND** 系统使用选中的模型进行 AI 分析

#### Scenario: 切换模型后重新分析

- **GIVEN** 用户已完成一次 AI 分析
- **WHEN** 用户切换到不同的模型并点击"重新分析"
- **THEN** 系统 SHALL 使用新选择的模型重新进行分析
- **AND** 分析结果 SHALL 基于新模型的输出

#### Scenario: 模型选择器加载失败

- **GIVEN** 获取可用模型列表失败
- **WHEN** 组件仍然显示分析功能
- **THEN** 系统 SHALL 显示错误提示
- **AND** 系统 SHALL 使用默认模型进行分析
- **AND** 模型选择器 SHALL 显示为禁用状态或隐藏

### Requirement: AI 分析 API 支持模型参数

`PUT /api/market-fetcher/ai` 接口 SHALL 支持可选的 `modelSlug` 参数。

#### Scenario: API 接受模型参数

- **GIVEN** 客户端发送 PUT 请求到 `/api/market-fetcher/ai`
- **WHEN** 请求体包含 `modelSlug` 字段
- **THEN** 系统 SHALL 使用指定的模型进行 AI 分析
- **AND** 日志 SHALL 记录使用的模型

#### Scenario: API 未提供模型参数

- **GIVEN** 客户端发送 PUT 请求到 `/api/market-fetcher/ai`
- **WHEN** 请求体不包含 `modelSlug` 字段
- **THEN** 系统 SHALL 使用用户的默认模型进行 AI 分析
- **AND** 系统行为与修改前保持一致

#### Scenario: 指定模型不可用

- **GIVEN** 客户端请求的 `modelSlug` 不在用户可用模型列表中
- **WHEN** 系统处理请求
- **THEN** 系统 SHALL fallback 到用户的默认模型
- **AND** 系统 SHALL 记录警告日志