## ADDED Requirements

### Requirement: 报告生成模型选择功能

用户在生成投资报告时 SHALL 能够选择要使用的 AI 模型。

#### Scenario: 报告生成页面显示模型选择器

- **GIVEN** 用户在报告生成页面
- **WHEN** 页面加载完成
- **THEN** 系统 SHALL 显示模型选择下拉框
- **AND** 下拉框 SHALL 列出用户配置的所有可用模型
- **AND** 默认选中用户的默认模型

#### Scenario: 选择模型生成报告

- **GIVEN** 用户已选择一个模型
- **AND** 用户选择了报告类型（周报/月报）
- **WHEN** 用户点击"生成报告"按钮
- **THEN** 系统 SHALL 调用 `POST /api/report` 接口
- **AND** 请求体 SHALL 包含 `modelSlug` 字段（用户选择的模型标识）
- **AND** 系统使用选中的模型生成投资报告

#### Scenario: 异步报告生成中的模型选择

- **GIVEN** 用户发起报告生成请求
- **WHEN** 报告异步生成过程中
- **THEN** 系统 SHALL 在 `processReportGeneration` 中使用指定的模型
- **AND** 报告内容 SHALL 基于选中模型的输出

### Requirement: 报告生成 API 支持模型参数

`POST /api/report` 接口 SHALL 支持可选的 `modelSlug` 参数。

#### Scenario: 报告生成 API 接受模型参数

- **GIVEN** 客户端发送 POST 请求到 `/api/report`
- **WHEN** 请求体包含 `modelSlug` 字段
- **THEN** 系统 SHALL 在 `generateAIReportContent` 中使用指定的模型
- **AND** 日志 SHALL 记录使用的模型

#### Scenario: 报告生成 API 未提供模型参数

- **GIVEN** 客户端发送 POST 请求到 `/api/report`
- **WHEN** 请求体不包含 `modelSlug` 字段
- **THEN** 系统 SHALL 使用用户的默认模型生成报告
- **AND** 系统行为与修改前保持一致

### Requirement: 报告生成服务层支持模型选择

`ReportService` SHALL 支持在生成 AI 报告内容时指定模型。

#### Scenario: 服务层接受模型参数

- **GIVEN** `generateAIReportContent` 方法被调用
- **WHEN** 传入 `modelSlug` 参数
- **THEN** 方法 SHALL 调用 `chatModelOpenAI(modelSlug)` 获取指定模型
- **AND** 使用指定模型执行 LangChain Agent

#### Scenario: 服务层未传入模型参数

- **GIVEN** `generateAIReportContent` 方法被调用
- **WHEN** 未传入 `modelSlug` 参数
- **THEN** 方法 SHALL 调用 `chatModelOpenAI()` 获取默认模型
- **AND** 行为与修改前保持一致