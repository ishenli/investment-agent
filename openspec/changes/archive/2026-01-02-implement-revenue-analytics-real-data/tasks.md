# Implementation Tasks: Real Data for Revenue Analytics

## P1 - Foundation (Data Layer & Backend API)

- [x] **TASK-1.1**: 定义新的 TypeScript 类型
  - File: `src/types/account.ts`
  - 添加 `revenueHistoryPointSchema` 和 `revenueHistorySchema`
  - 添加 `revenueHistoryQuerySchema` 用于查询参数验证
  - 导出类型 `revenueHistoryPointType` 和 `revenueHistoryType`

- [x] **TASK-1.2**: 创建金融计算工具函数
  - File: `src/server/lib/utils/financialCalculations.ts` (新建)
  - 实现 `calculateAnnualizedReturn(totalReturn, daysInvested)`
  - 实现 `calculateVolatility(returnRates, days)`
  - 实现 `calculateSharpeRatio(annualizedReturn, volatility, riskFreeRate)`
  - 实现 `calculateMaxDrawdown(netValues)`
  - 实现 `calculateDrawdownSeries(netValues)`（返回每个时间点的回撤）
  - 使用 Decimal.js 确保计算精度
  - 添加单元测试覆盖所有函数

- [x] **TASK-1.3**: 实现后端服务层方法 `getRevenueHistoryData`
  - File: `src/server/service/assetService.ts`
  - 方法签名: `async getRevenueHistoryData(accountId: string, period: string, granularity: 'weekly' | 'monthly')`
  - 查询账户在指定时间范围内的所有交易记录和持仓数据
  - 计算每个时间点（每日）的账户净值
  - 根据粒度（周/月）聚合数据
  - 调用工具函数计算衍生指标（年化收益率、夏普比率、波动率、最大回撤）
  - 返回符合 `revenueHistoryType` 类型的数据
  - 处理无数据场景（空数组）

- [x] **TASK-1.4**: 实现后端控制器方法 `getRevenueHistory`
  - File: `src/server/controller/assetAccount.ts`
  - 使用 `@WithRequestContext` 装饰器
  - 验证用户身份（调用 `AuthService.getCurrentUserAccount()`）
  - 验证查询参数（使用 Zod schema）
  - 调用 `assetService.getRevenueHistoryData()`
  - 错误处理：区分数据库错误、参数错误、未授权错误
  - 返回统一格式的成功/错误响应

- [x] **TASK-1.5**: 创建新的 API 路由
  - File: `src/app/api/asset/account/revenue/history/route.ts` (新建)
  - 实现 `GET` 方法
  - 从 Request 中提取 query 参数
  - 调用 `AssetAccountBizController.getRevenueHistory()`
  - 返回 JSON 响应

## P2 - Frontend Integration (Data Fetching & Hooks)

- [x] **TASK-2.1**: 实现前端 service 方法 `fetchRevenueHistory`
  - File: `src/app/services/assetService.ts`
  - 导出 `fetchRevenueHistory(period: string, granularity: string)`
  - 使用现有的 `get()` 工具函数
  - 请求路径: `/api/asset/account/revenue/history`
  - 解析响应并返回 `revenueHistoryType` 类型数据
  - 错误处理：抛出异常交由 React Query 处理

- [x] **TASK-2.2**: 实现自定义 Hook `useRevenueHistoryQuery`
  - File: `src/app/hooks/useAssetQueries.ts`
  - 接受参数: `period` (string), `granularity` (string)
  - 使用 `useQuery` 从 `@tanstack/react-query`
  - 配置 `queryKey`: `['revenue-history', period, granularity]`
  - 配置 `staleTime`: 5 分钟（1000 * 60 * 5）
  - 配置 `retry`: 1 次
  - 返回: `{ data, isLoading, isError, error, refetch }`

## P3 - UI Implementation (Component Updates)

- [x] **TASK-3.1**: 修改 `revenue-analytics.tsx` 组件 - 移除模拟数据
  - File: `src/app/(pages)/asset/components/revenue-analytics.tsx`
  - 删除硬编码的 `returnsData` 常量（第 50-57 行）
  - 删除硬编码的 `drawdownData` 常量（第 59-66 行）
  - 删除 `ExtendedRevenueMetricType` 接口定义（第 35-41 行）
  - 保留现有的 `revenueMetricType` 导入

- [x] **TASK-3.2**: 修改 `revenue-analytics.tsx` - 集成真实数据查询
  - 添加新状态: `granularity` (string, 默认 'monthly')
  - 创建两个 Select 组件：
    - 时间范围选择器（period）- 已存在，保持不变
    - 时间粒度选择器（granularity）- 新增，提供"按周"和"按月"两个选项
  - 调用 `useRevenueHistoryQuery(period, granularity)` 获取历史数据
  - 从 API 响应中解构数据结构和衍生指标

- [x] **TASK-3.3**: 修改 `revenue-analytics.tsx` - 更新指标卡片
  - 总收益率：使用 `derivedMetrics.annualizedReturn` 或历史数据计算
  - 年化收益率：使用 `derivedMetrics.annualizedReturn`
  - 夏普比率：使用 `derivedMetrics.sharpeRatio`
  - 浮动盈亏：继续使用现有的 `metrics.unrealizedProfitRate`
  - 胜率：继续使用现有的 `metrics.winRate`
  - 波动率和最大回撤：使用 `derivedMetrics.volatility` 和 `derivedMetrics.maxDrawdown`

- [x] **TASK-3.4**: 修改 `revenue-analytics.tsx` - 更新图表数据
  - 收益率柱状图：使用 `historyData.data` 替换硬编码数据
    - dataKey 映射：`returnRate` -> `value`
    - YAxis domain 根据实际数据动态调整
  - 回撤折线图：使用 `historyData.data` 替换硬编码数据
    - dataKey 映射：`drawdown` -> `value`
    - YAxis domain 根据实际数据动态调整
  - 更新 Tooltip formatter 以正确格式化百分比
  - 更新 XAxis formatter 以显示可读的日期格式

- [x] **TASK-3.5**: 修改 `revenue-analytics.tsx` - 响应式粒度选择
  - 在每个图表的 CardHeader 中添加粒度选择器
  - 或在整个组件顶部添加全局粒度选择器（推荐）
  - 确保选择器在移动端和桌面端都有良好的布局
  - 粒度选择变化时触发数据重新查询

- [x] **TASK-3.6**: 修改 `revenue-analytics.tsx` - 错误和空状态处理
  - 加载状态：现有骨架屏保持不变
  - 错误状态：在现有的"加载失败"卡片中添加"重试"按钮
  - 空数据状态：保留现有的"暂无数据"卡片
  - 增加对 API 返回数据的空数组检查

## P2.5 - Testing & Quality Assurance

- [x] **TASK-Q.1**: 为金融计算函数编写单元测试
  - File: `src/server/lib/utils/__tests__/financialCalculations.test.ts`
  - 测试 `calculateAnnualizedReturn` 边界情况（零收益、负收益、多年)
  - 测试 `calculateVolatility` 精确性（与已验证的结果对比）
  - 测试 `calculateSharpeRatio` 极端情况（零波动率、负夏普）
  - 测试 `calculateMaxDrawdown` 各种净值曲线形状
  - 所有 22 个单元测试均通过
  - 修复运行时错误：`inverse()` 方法不存在，使用正确的 CAGR 公式：(1+totalReturn)^(365/daysInvested)-1

- [ ] **TASK-Q.2**: 为后端服务方法编写集成测试
  - 测试 `getRevenueHistoryData` 不同 period 和 granularity 组合
  - 测试无数据场景（新账户）
  - 测试有数据但不完整的场景（只有买入，没有卖出）
  - Mock 数据库查询

- [ ] **TASK-Q.3**: 为前端组件编写组件测试
  - File: `src/app/(pages)/asset/components/__tests__/revenue-analytics.test.tsx`
  - 测试组件渲染和正确的显示
  - 测试时间范围和粒度选择器的交互
  - 测试加载、错误、空数据状态
  - Mock `useRevenueQuery` 和 `useRevenueHistoryQuery`

- [ ] **TASK-Q.4**: 手动测试完整流程
  - 在开发环境准备测试账户数据
  - 测试不同时间范围：7d, 30d, 90d, 365d, all
  - 测试不同粒度：周级别、月级别
  - 验证计算结果的正确性（与手动计算对比）
  - 测试边界情况：新账户、大量数据、极端收益

## P3 - Documentation & Cleanup

- [ ] **TASK-D.1**: 更新相关的代码注释
  - 在新添加的函数中添加 JSDoc 注释
  - 更新 `revenue-analytics.tsx` 的组件级注释
  - 说明数据来源和计算逻辑

- [ ] **TASK-D.2**: 验证 OpenSpec 规格
  - 运行 `openspec validate implement-revenue-analytics-real-data --strict`
  - 修复所有验证错误
  - 确保每个 Requirement 至少有一个 Scenario
  - 确保所有 Scenario 使用正确的 `#### Scenario:` 格式

- [ ] **TASK-D.3**: 清理和优化
  - 移除不再使用的代码和注释
  - 运行 TypeScript 编译检查 (`tsc --noEmit`)
  - 运行 ESLint 检查 (`eslint src/app/(pages)/asset/components/revenue-analytics.tsx`)
  - 运行 Prettier 格式化

## 实施注意事项

1. **数据精度**: 所有金融计算使用 Decimal.js，避免使用普通浮点数运算
2. **时区处理**: 日期计算使用本地时区或明确 UTC，保持一致性
3. **性能考虑**: 大量历史数据可能需要优化查询，考虑添加分页或数据限制
4. **向后兼容**: 现有的 `revenue` API 保持不变，新增 `history` 端点
5. **用户体验**: 首次加载可能较慢，确保骨架屏友好