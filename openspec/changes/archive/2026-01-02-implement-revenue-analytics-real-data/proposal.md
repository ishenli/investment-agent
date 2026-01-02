# Change: Implement Real Data for Revenue Analytics

## Why
收益分析组件当前使用的数据是硬编码的模拟数据，无法反映账户真实的投资表现。收益率曲线、回撤曲线、夏普比率、波动率等关键指标均为虚假数据，导致用户无法获得准确的资产分析结果。需要基于现有的交易记录和持仓数据计算真实的历史收益时间序列。

## What Changes
- 移除组件中的硬编码模拟数据（returnsData 和 drawdownData）
- 修改 `revenue-analytics.tsx` 组件，使其从后端 API 获取真实的收益历史时间序列数据
- 创建新的 API 端点 `/api/asset/account/revenue/history`，提供按时间周期计算的收益率和回撤历史数据
- 实现后端服务逻辑，基于交易记录和持仓数据计算周级别和月级别的收益率及回撤
- 扩展收益指标类型，新增计算衍生指标（年化收益率、夏普比率、最大回撤、波动率）
- 保留现有的 `useRevenueQuery` 用于获取汇总指标，添加新的 `useRevenueHistoryQuery` 用于获取时间序列数据
- 更新前端组件以支持时间范围选择（7d, 30d, 90d, 365d, all）和时间粒度选择（周/月）

## Impact
- Affected specs: `revenue-analytics` (新增能力)
- Affected code:
  - 前端: `src/app/(pages)/asset/components/revenue-analytics.tsx`
  - 前端服务: `src/app/services/assetService.ts`
  - 前端 Hooks: `src/app/hooks/useAssetQueries.ts`
  - 后端控制器: `src/server/controller/assetAccount.ts`
  - 后端服务: `src/server/service/assetService.ts`
  - API 路由: 新增 `src/app/api/asset/account/revenue/history/route.ts`
  - 类型定义: 更新 `src/types/account.ts`
- External API: 无外部 API 调用（基于现有交易和持仓数据计算）
- Performance: 基于现有数据源计算，可能需要优化查询性能（考虑添加缓存或数据预聚合）