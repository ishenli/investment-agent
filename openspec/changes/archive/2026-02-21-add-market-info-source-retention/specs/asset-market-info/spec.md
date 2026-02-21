## ADDED Requirements

### Requirement: 市场信息原文保留功能

用户添加市场信息时 SHALL 能够选择内容处理方式：AI提取摘要 或 保留原始文章内容。

#### Scenario: 通过market-fetcher流程保存原文

- **GIVEN** 用户完成 StepOne（内容录入）和 StepTwo（AI分析可选择跳过）
- **AND** 用户在 StepThreeDataSaver 中选择"原文保留"模式
- **WHEN** 用户点击"确认保存"按钮
- **THEN** 系统 SHALL 调用 `POST /api/market-fetcher/save` 接口
- **AND** 请求体中 `contentMode` 为 `'original'`
- **AND** 系统通过 `marketInfoId` 获取 `MarketInformation.content`
- **AND** 将原文内容保存到 `assetMarketInfo.originalContent` 字段
- **AND** 设置 `assetMarketInfo.contentMode` 为 `'original'`
- **AND** 返回保存成功的记录

#### Scenario: 通过快速弹窗直接添加原文

- **GIVEN** 用户在资产详情页点击"添加市场纪要"按钮
- **WHEN** 弹窗中选择"原文保留"模式
- **AND** 填写标题、原文内容、选择关联资产
- **AND** 点击保存
- **THEN** 系统 SHALL 直接将原文保存到数据库
- **AND** `contentMode` 设置为 `'original'`

#### Scenario: 继续使用AI摘要模式保存

- **GIVEN** 用户在 StepThreeDataSaver 中选择"AI摘要"模式（默认）
- **WHEN** 用户点击"确认保存"按钮
- **THEN** 系统 SHALL 保持现有行为，保存AI分析字段
- **AND** `contentMode` 设置为 `'ai_summary'`
- **AND** 向后兼容，不破坏现有API调用

#### Scenario: 查看原文类型的市场信息

- **GIVEN** 已有一条 `contentMode='original'` 的市场信息
- **WHEN** 用户在"最新市场纪要"或"历史市场纪要"中查看
- **THEN** 系统 SHALL 展示完整的 `originalContent` 内容
- **AND** 显示"原文"类型标识
- **AND** 支持长文本展开/折叠

#### Scenario: 原文长度超过限制

- **GIVEN** 用户提交原文内容
- **WHEN** 原文长度超过 100KB（约10万字符）
- **THEN** 系统 SHALL 拒绝保存
- **AND** 返回错误信息"原文内容不能超过100KB"

### Requirement: 内容处理模式字段

数据库 SHALL 通过 `contentMode` 字段标识每条市场信息的内容处理模式。

#### Scenario: 数据库 Schema 支持内容模式

- **GIVEN** 数据库表 `assetMarketInfo`
- **THEN** 表 SHALL 包含 `content_mode` 字段（TEXT类型，非NULL）
- **AND** 默认值为 `'ai_summary'`
- **AND** 仅接受枚举值 `'ai_summary'` 和 `'original'`

#### Scenario: 数据库 Schema 支持原文字段

- **GIVEN** 数据库表 `assetMarketInfo`
- **THEN** 表 SHALL 包含 `original_content` 字段（TEXT类型，可为NULL）
- **AND** 用于保存原始文章内容
- **AND** 当 `content_mode='original'` 时该字段应有值

### Requirement: StepThreeDataSaver模式切换

StepThreeDataSaver 组件 SHALL 提供模式切换功能，允许用户在AI摘要和原文保留之间选择。

#### Scenario: 模式选择器展示

- **GIVEN** 用户进入 StepThreeDataSaver 步骤
- **THEN** 组件 SHALL 展示模式切换UI
- **AND** 默认选中"AI摘要"模式（与现有行为一致）
- **AND** 提供"原文保留"选项

#### Scenario: AI摘要模式预览展示

- **GIVEN** 用户选择"AI摘要"模式
- **THEN** 组件 SHALL 展示AI分析结果的预览
  - 标题
  - 投资倾向（sentiment）
  - 重要性（importance）
  - 关键词（keyTopics）
  - 重要数据（keyDataPoints）
  - 市场影响（marketImpact）
  - 内容摘要（summary）

#### Scenario: 原文模式预览展示

- **GIVEN** 用户选择"原文保留"模式
- **THEN** 组件 SHALL 展示 `MarketInformation.content` 的预览
- **AND** 显示原文字数统计
- **AND** 提供展开/折叠功能查看完整内容

### Requirement: 快速添加原文弹窗

系统 SHALL 提供独立的弹窗组件，允许用户直接在资产详情页添加原文类型的市场信息。

#### Scenario: 弹窗入口按钮

- **GIVEN** 用户在资产详情页
- **WHEN** 在"最新市场纪要"或"历史市场纪要"标签页
- **THEN** 页面 SHALL 显示"添加市场纪要"按钮
- **AND** 点击按钮打开添加弹窗

#### Scenario: 原文模式表单

- **GIVEN** 用户打开添加市场纪要弹窗
- **WHEN** 选择"原文保留"模式
- **THEN** 表单 SHALL 显示以下字段：
  - 关联资产选择（多选，必填）
  - 标题输入（必填）
  - 原文内容大文本框（必填，支持多行）
  - 来源URL（可选）
  - 来源名称（可选）

#### Scenario: 原文表单验证

- **GIVEN** 用户在原文模式下提交表单
- **WHEN** 必填字段为空或原文超过100KB
- **THEN** 系统 SHALL 阻止提交
- **AND** 显示相应的错误提示

## MODIFIED Requirements

### Requirement: 保存市场信息API接口

现有的 `POST /api/market-fetcher/save` 接口 SHALL 扩展以支持 `contentMode` 参数和原文保存功能。

#### Scenario: AI摘要模式API请求（向后兼容）

- **GIVEN** 客户端发送 POST 请求到 `/api/market-fetcher/save`
- **WHEN** 请求体包含 AI摘要字段（title, sentiment, summary等）
- **AND** `contentMode` 未提供或为 `'ai_summary'`
- **THEN** 系统 SHALL 保持现有行为，保存AI提取的摘要
- **AND** `contentMode` 默认设置为 `'ai_summary'`

#### Scenario: 原文模式API请求通过marketInfoId

- **GIVEN** 客户端发送 POST 请求到 `/api/market-fetcher/save`
- **WHEN** 请求体包含 `contentMode: 'original'`
- **AND** 提供 `marketInfoId` 参数
- **THEN** 系统 SHALL 通过 `marketInfoId` 获取 `MarketInformation`
- **AND** 将 `MarketInformation.content` 保存到 `originalContent` 字段
- **AND** 设置 `contentMode` 为 `'original'`
- **AND** 其他字段（title, symbol等）从请求体获取

#### Scenario: 原文模式API请求直接传原文

- **GIVEN** 客户端发送 POST 请求到 `/api/market-fetcher/save`
- **WHEN** 请求体包含 `contentMode: 'original'`
- **AND** 提供 `originalContent` 字段直接传入原文
- **THEN** 系统 SHALL 直接将 `originalContent` 保存到数据库
- **AND** 无需通过 `marketInfoId` 查找

#### Scenario: MarketInformation不存在错误处理

- **GIVEN** 原文模式请求包含 `marketInfoId`
- **WHEN** 对应的 `MarketInformation` 记录不存在
- **THEN** 系统 SHALL 返回 404 错误
- **AND** 错误信息为"未找到原始市场信息记录"

### Requirement: 资产市场信息服务层

AssetMarketInfoService SHALL 支持创建和查询包含原文内容的市场信息。

#### Scenario: 服务层创建方法支持原文模式

- **GIVEN** 调用 `createAssetMarketInfo` 方法
- **WHEN** 传入 `contentMode: 'original'` 和 `originalContent`
- **THEN** 方法 SHALL 保存原文到数据库
- **AND** AI摘要相关字段可为空或使用简化值（如原文前200字作为summary）
- **AND** 返回的 `AssetMarketInfoType` 包含新字段

#### Scenario: 服务层查询方法返回原文

- **GIVEN** 调用查询方法（如 `getAssetMarketInfoById`）
- **WHEN** 查询到一条 `contentMode='original'` 的记录
- **THEN** 返回结果 SHALL 包含 `originalContent` 字段
- **AND** 返回结果 SHALL 包含 `contentMode` 字段

### Requirement: 市场信息展示组件

LatestMarketInfoView 和 HistoryMarketInfoView 组件 SHALL 根据 `contentMode` 以不同方式展示市场信息。

#### Scenario: 原文模式详情展示

- **GIVEN** 展示一条 `contentMode='original'` 的市场信息
- **THEN** 组件 SHALL 展示 `originalContent` 完整内容
- **AND** 显示"原文"类型徽章
- **AND** 支持长文本折叠（超过500字时默认折叠）

#### Scenario: 混合列表展示

- **GIVEN" 历史列表包含AI摘要和原文两种类型的记录
- **THEN** 每条记录 SHALL 显示对应的类型标识
- **AND** AI摘要记录显示summary预览
- **AND** 原文记录显示originalContent预览（前100字）

## REMOVED Requirements

None. 本变更无删除功能，仅新增功能和扩展现有API。
