## ADDED Requirements

### Requirement: Market Info Agent Tools

系统 SHALL 为 Agent 提供市场信息相关的工具。

#### Scenario: 查询市场信息列表

- **WHEN** Agent 调用 `market_info_list` 工具
- **THEN** 系统 SHALL 返回市场信息列表
- **AND** 支持分页和日期范围过滤

#### Scenario: 获取最新市场信息

- **WHEN** Agent 调用 `market_info_latest` 工具
- **THEN** 系统 SHALL 返回指定资产的最新市场信息
- **AND** 参数包括 `assetMetaId`

#### Scenario: 获取市场信息详情

- **WHEN** Agent 调用 `market_info_detail` 工具
- **THEN** 系统 SHALL 返回指定 ID 的市场信息详情
- **AND** 参数包括 `id`

#### Scenario: 保存市场信息

- **WHEN** Agent 调用 `market_info_save` 工具
- **THEN** 系统 SHALL 创建新的市场信息记录
- **AND** 参数包括 `assetMetaIds`, `title`, `summary`, `sentiment`, `importance` 等

#### Scenario: 更新市场信息

- **WHEN** Agent 调用 `market_info_update` 工具
- **THEN** 系统 SHALL 更新指定 ID 的市场信息
- **AND** 支持部分字段更新

#### Scenario: 删除市场信息

- **WHEN** Agent 调用 `market_info_delete` 工具
- **THEN** 系统 SHALL 删除指定 ID 的市场信息
- **AND** 需要确认参数 `id`

---

### Requirement: Report Agent Tools

系统 SHALL 为 Agent 提供报告相关的工具。

#### Scenario: 查询报告列表

- **WHEN** Agent 调用 `report_list` 工具
- **THEN** 系统 SHALL 返回报告列表
- **AND** 支持按类型（weekly/monthly/emergency）过滤
- **AND** 支持分页参数

#### Scenario: 获取报告详情

- **WHEN** Agent 调用 `report_detail` 工具
- **THEN** 系统 SHALL 返回指定 ID 的报告详情
- **AND** 参数包括 `id`

---

### Requirement: Tool Schema 定义

所有新增工具 SHALL 使用 TypeBox Schema 定义参数。

#### Scenario: Schema 一致性

- **WHEN** 定义工具 Schema
- **THEN** Schema SHALL 与 Controller 的 Zod Schema 保持一致
- **AND** 提供清晰的参数描述

#### Scenario: 错误处理

- **WHEN** 工具调用失败
- **THEN** 系统 SHALL 返回包含错误信息的响应
- **AND** 错误信息 SHALL 足够 Agent 理解问题
