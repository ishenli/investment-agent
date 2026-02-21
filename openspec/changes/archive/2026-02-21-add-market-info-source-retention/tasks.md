# Implementation Tasks: 市场信息原文保留功能

## User Story P1: 数据库Schema迁移

- [x] 1.1 创建数据库迁移文件
  - [x] 1.1.1 在 `assetMarketInfo` 表添加 `originalContent` 字段 (text, nullable)
  - [x] 1.1.2 在 `assetMarketInfo` 表添加 `contentMode` 字段 (text, default 'ai_summary', not null)
  - [x] 1.1.3 运行迁移命令: `pnpm db:generate` 和 `pnpm db:migrate`
  - [x] 1.1.4 验证迁移结果

- [x] 1.2 更新TypeScript类型定义
  - [x] 1.2.1 在 `src/types/marketInfo.ts` 添加 `ContentMode` 类型: `'ai_summary' | 'original'`
  - [x] 1.2.2 修改 `AssetMarketInfoType` 接口，添加 `originalContent: string | null` 和 `contentMode: ContentMode`
  - [x] 1.2.3 修改 `CreateAssetMarketInfoRequest` 接口，添加新字段

- [x] 1.3 更新Drizzle Schema
  - [x] 1.3.1 修改 `drizzle/schema.ts` 中的 `assetMarketInfo` 表定义
  - [x] 1.3.2 验证类型导出正确

## User Story P2: 后端API改造

- [x] 2.1 更新AssetMarketInfoService
  - [x] 2.1.1 修改 `createAssetMarketInfo` 方法，支持保存 `originalContent` 和 `contentMode`
  - [x] 2.1.2 更新所有查询方法，确保 `originalContent` 和 `contentMode` 被正确返回
  - [x] 2.1.3 如有测试文件，更新单元测试

- [x] 2.2 更新MarketBizController.saveMarketInfo
  - [x] 2.2.1 修改验证 Schema，添加 `contentMode` 字段（默认 'ai_summary'）
  - [x] 2.2.2 实现原文模式逻辑：
    - 当 `contentMode === 'original'` 且提供 `marketInfoId` 时
    - 从 MarketFetcherService 获取 MarketInformation
    - 将 `MarketInformation.content` 作为 `originalContent` 保存
  - [x] 2.2.3 原文模式下，AI摘要字段可为空或使用默认值

- [x] 2.3 更新API路由 /api/market-fetcher/save
  - [x] 2.3.1 确保路由处理器传递 `contentMode` 参数到Controller
  - [x] 2.3.2 向后兼容测试：不传 `contentMode` 时默认使用 'ai_summary'

- [x] 2.4 添加MarketFetcherService集成
  - [x] 2.4.1 在 MarketBizController 中注入 MarketFetcherService（用于获取原文）
  - [x] 2.4.2 处理 `marketInfoId` 不存在的情况，返回友好错误

## User Story P3: StepThreeDataSaver组件改造

- [x] 3.1 添加模式切换UI
  - [x] 3.1.1 添加 `contentMode` 状态，默认 `'ai_summary'`
  - [x] 3.1.2 创建 `ContentModeSelector` 组件（Tabs或Radio Group）
  - [x] 3.1.3 在资产选择器下方添加模式选择器

- [x] 3.2 AI摘要模式预览（现有功能）
  - [x] 3.2.1 保留现有的AI分析结果预览展示
  - [x] 3.2.2 确保此模式下所有摘要字段正确展示

- [x] 3.3 原文模式预览（新增）
  - [x] 3.3.1 创建 `OriginalContentPreview` 组件
  - [x] 3.3.2 从 `marketInfo.content` 展示原文内容
  - [x] 3.3.3 添加折叠/展开功能（原文可能很长）
  - [x] 3.3.4 显示原文字数统计

- [x] 3.4 修改保存逻辑
  - [x] 3.4.1 修改 `handleFinalSave` 方法，根据 `contentMode` 构造请求体
  - [x] 3.4.2 AI摘要模式：保持现有请求体不变
  - [x] 3.4.3 原文模式：构造简化请求体，包含 `contentMode: 'original'` 和 `marketInfoId`

- [x] 3.5 UI优化
  - [x] 3.5.1 根据模式切换动态更新确认展示区域的标题和内容
  - [x] 3.5.2 原文模式下隐藏AI摘要相关字段
  - [x] 3.5.3 添加模式切换提示说明

## User Story P4: 新增快速添加原文弹窗

- [x] 4.1 创建AddMarketInfoDialog组件
  - [x] 4.1.1 创建基础文件 `src/app/(pages)/asset-market-info/[id]/components/AddMarketInfoDialog.tsx`
  - [x] 4.1.2 使用 shadcn/ui Dialog 组件
  - [x] 4.1.3 定义 Props 接口

- [x] 4.2 实现模式选择
  - [x] 4.2.1 添加模式切换器（默认选中 "原文保留" 模式）
  - [x] 4.2.2 模式切换时清空/保留相关表单字段

- [x] 4.3 实现原文模式表单
  - [x] 4.3.1 资产选择器（多选，复用 StepThreeDataSaver 中的逻辑）
  - [x] 4.3.2 标题输入框（必填）
  - [x] 4.3.3 原文大文本框（TEXTAREA，至少15行，必填）
  - [x] 4.3.4 字符计数器（显示当前字数和100KB限制）
  - [x] 4.3.5 来源URL输入（可选）
  - [x] 4.3.6 来源名称输入（可选）

- [x] 4.4 实现保存逻辑
  - [x] 4.4.1 由于不走 MarketInformation 中间存储，需要新API或直接调用 service
  - [x] 4.4.2 考虑复用 `POST /api/market-fetcher/save` API 但要支持直接传 `originalContent`
  - [x] 4.4.3 或者：先在后台创建临时 MarketInformation 再保存
  - [x] 4.4.4 实现表单验证和错误处理

- [x] 4.5 集成到资产详情页
  - [x] 4.5.1 在 `MarketInfoTabs.tsx` 添加"添加市场纪要"按钮（最新/历史标签页）
  - [x] 4.5.2 在 `asset-market-info-detail.tsx` 集成弹窗组件
  - [x] 4.5.3 保存成功后刷新市场纪要列表

## User Story P5: 原文展示功能

- [x] 5.1 修改LatestMarketInfoView组件
  - [x] 5.1.1 根据 `contentMode` 展示不同视图
  - [x] 5.1.2 `contentMode='original'` 时展示 `originalContent` 全文
  - [x] 5.1.3 `contentMode='ai_summary'` 时保持现有展示方式
  - [x] 5.1.4 添加模式标签标识（徽章形式）

- [x] 5.2 修改HistoryMarketInfoView组件
  - [x] 5.2.1 在列表项添加模式标识（小标签）
  - [x] 5.2.2 原文模式项显示原文预览（前100字）
  - [x] 5.2.3 AI摘要模式项显示现有摘要预览

- [x] 5.3 安全处理
  - [x] 5.3.1 原文展示时进行 HTML 转义，防止XSS
  - [x] 5.3.2 长文本支持展开/折叠

## User Story P6: 测试与验证

- [x] 6.1 功能测试
  - [x] 6.1.1 测试AI摘要模式保存（现有功能回归测试）
  - [x] 6.1.2 测试原文模式通过 market-fetcher 流程保存
  - [x] 6.1.3 测试快速添加弹窗保存原文
  - [x] 6.1.4 验证数据库保存正确

- [x] 6.2 边界测试
  - [x] 6.2.1 测试超长原文（>100KB）的验证
  - [x] 6.2.2 测试特殊字符在原文中的存储和展示
  - [x] 6.2.3 测试不传 `contentMode` 时的默认行为

- [x] 6.3 UI/UX测试
  - [x] 6.3.1 测试模式切换时UI正确更新
  - [x] 6.3.2 测试在不同屏幕尺寸下的显示效果
  - [x] 6.3.3 验证加载状态和错误状态展示

## User Story P7: 文档与代码清理

- [x] 7.1 API文档更新
  - [x] 7.1.1 更新 `/api/market-fetcher/save` 接口文档
  - [x] 7.1.2 添加 `contentMode` 参数说明

- [x] 7.2 代码注释
  - [x] 7.2.1 新增方法添加 JSDoc 注释
  - [x] 7.2.2 复杂业务逻辑添加行内注释

## Task Dependencies

```
P1 (数据库) ───────────────────────────┐
                                       ▼
P2 (后端API) ──▶ P3 (StepThreeDataSaver) ──▶ P6 (测试)
                                       │
                                       ▼
                              P4 (AddMarketInfoDialog)
                                       │
                                       ▼
                              P5 (原文展示) ──▶ P6 (测试)
                                       │
                                       ▼
                               P7 (文档清理)
```

## Definition of Done

- [x] 用户在 StepThreeDataSaver 可以选择 AI摘要 或 原文保留 模式
- [x] 原文模式成功保存 `MarketInformation.content` 到数据库
- [x] 用户可以在资产详情页通过弹窗快速添加原文
- [x] 原文类型的市场信息可以完整展示
- [x] AI摘要模式保持现有功能不变
- [x] 所有相关测试通过
- [x] 代码经过 Review
