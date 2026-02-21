# Change: 添加市场信息原文保留功能

## Why

当前系统添加市场信息的流程是：抓取/输入内容 → AI分析提取摘要 → 保存摘要到数据库。用户希望能够保留原始文章内容作为另一种选择，而非强制AI提取摘要。

使用场景：
- 有些深度分析文章，AI摘要可能遗漏重要细节，需要保留完整原文供后续回顾
- 用户希望快速保存原始文章内容，稍后再决定是否AI分析
- 某些非结构化内容不适合AI摘要，更适合保留原文

## What Changes

1. **数据库Schema变更** - `assetMarketInfo` 表新增字段：
   - `originalContent`: 存储原始文章内容
   - `contentMode`: 标记内容处理模式 ('ai_summary' | 'original')

2. **API改造** - 修改现有的 `POST /api/market-fetcher/save`：
   - 新增 `contentMode` 参数
   - `contentMode='ai_summary'` (默认): 保持现有行为，保存AI分析结果
   - `contentMode='original'`: 从 `MarketInformation` 取原文保存到 `originalContent` 字段

3. **前端UI改造** - 修改 `StepThreeDataSaver` 组件：
   - 添加模式切换UI（AI提取摘要 vs 保留原文）
   - 原文模式展示内容预览而非摘要字段
   - 支持从资产详情页直接添加原文（不经过AI分析流程）

4. **新增快捷入口** - 支持跳过AI分析直接保存原文

## Impact

- **Affected specs**: asset-market-info
- **Affected tables**: `assetMarketInfo` (新增2个字段)
- **Affected APIs**:
  - `POST /api/market-fetcher/save` - 新增 `contentMode` 和 `originalContent` 支持
- **Affected Components**:
  - `StepThreeDataSaver.tsx` - 添加模式切换UI
  - `LatestMarketInfoView.tsx` - 新增原文展示
  - 新增 `AddMarketInfoDialog.tsx` - 快速添加原文弹窗

## Breaking Changes

None. 向后兼容：
- `contentMode` 默认为 `'ai_summary'`，现有API调用不受影响
- 数据库新字段均可为空或有默认值
- 现有AI分析流程保持不变
