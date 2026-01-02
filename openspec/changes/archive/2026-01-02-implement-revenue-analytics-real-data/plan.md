# Technical Design: Real Data for Revenue Analytics

## 1. Tech Stack
- **Backend API**: Next.js API Routes (TypeScript)
- **Data Access**: Drizzle ORM with SQLite
- **Math Computation**: Decimal.js (for precise financial calculations)
- **Frontend**: React 19 + TypeScript
- **Data Fetching**: TanStack Query (React Query)
- **Charting**: Recharts (already integrated)
- **State Management**: React Hooks (useState)

## 2. Schema Changes

### 2.1 New Type Definitions
File: `src/types/account.ts`

```typescript
// 扩展收益指标类型，添加历史数据类型
export const revenueHistoryPointSchema = z.object({
  date: z.string(), // ISO 8601 日期字符串
  returnRate: z.number(), // 收益率（小数形式，如 0.025 表示 2.5%）
  drawdown: z.number(), // 回撤（小数形式，如 -0.085 表示 -8.5%）
  netValue: z.number().optional(), // 账户净值（可选，用于更精确的回撤计算）
});

export type revenueHistoryPointType = z.infer<typeof revenueHistoryPointSchema>;

export const revenueHistorySchema = z.object({
  accountId: z.string(),
  period: z.string(), // 时间范围: '7d', '30d', '90d', '365d', 'all'
  granularity: z.enum(['weekly', 'monthly']), // 时间粒度
  data: z.array(revenueHistoryPointSchema),
  derivedMetrics: z.object({
    annualizedReturn: z.number(),
    sharpeRatio: z.number(),
    maxDrawdown: z.number(),
    volatility: z.number(),
  }),
  periodStart: z.date(),
  periodEnd: z.date(),
  createdAt: z.date(),
});

export type revenueHistoryType = z.infer<typeof revenueHistorySchema>;
```

### 2.2 Query Parameter Schema
```typescript
export const revenueHistoryQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '365d', 'all']).default('30d'),
  granularity: z.enum(['weekly', 'monthly']).default('monthly'),
});
```

## 3. API Design

### 3.1 New API Endpoint
**Route**: `GET /api/asset/account/revenue/history`

**Query Parameters**:
- `period`: string (required) - '7d', '30d', '90d', '365d', 'all'
- `granularity`: string (optional, default: 'monthly') - 'weekly', 'monthly'

**Response Format**:
```typescript
{
  "success": true,
  "data": {
    "accountId": "string",
    "period": "30d",
    "granularity": "monthly",
    "data": [
      {
        "date": "2025-01-01",
        "returnRate": 0.025,
        "drawdown": -0.005
      }
    ],
    "derivedMetrics": {
      "annualizedReturn": 0.15,
      "sharpeRatio": 1.2,
      "maxDrawdown": -0.085,
      "volatility": 0.153
    },
    "periodStart": "2024-12-03T00:00:00.000Z",
    "periodEnd": "2025-01-02T00:00:00.000Z",
    "createdAt": "2025-01-02T12:00:00.000Z"
  }
}
```

**Error Response**:
```typescript
{
  "success": false,
  "error": {
    "code": "QUERY_ERROR",
    "message": "获取收益历史数据失败"
  }
}
```

## 4. Component Hierarchy

### 4.1 Backend Structure
```
src/server/
├── controller/
│   └── assetAccount.ts
│       └── getRevenueHistory()
├── service/
│   └── assetService.ts
│       └── getRevenueHistoryData()
└── lib/
    └── utils/
        └── financialCalculations.ts (新建)
            ├── calculateAnnualizedReturn()
            ├── calculateVolatility()
            ├── calculateSharpeRatio()
            ├── calculateMaxDrawdown()
            └── calculateDrawdownSeries()
```

### 4.2 Frontend Structure
```
src/app/
├── api/
│   └── asset/
│       └── account/
│           └── revenue/
│               └── history/
│                   └── route.ts (新建)
├── hooks/
│   └── useAssetQueries.ts
│       └── useRevenueHistoryQuery() (新增)
├── services/
│   └── assetService.ts
│       └── fetchRevenueHistory() (新增)
└── (pages)/asset/components/
    └── revenue-analytics.tsx (修改)
```

## 5. Financial Calculation Logic

### 5.1 算法概述
所有计算基于账户净值（Net Value）随时间的变化：
- 账户净值 = 现金余额 + 股票市值
- 收益率 = (期末净值 - 期初净值) / 期初净值
- 回撤 = (当前净值 - 历史最高净值) / 历史最高净值

### 5.2 数据聚合策略

**周级别数据**:
- 基于每周最后一个交易日的净值
- 计算该周相对于上周的收益率
- 更新该周回撤值

**月级别数据**:
- 基于每月最后一个交易日的净值
- 计算该月相对于上月的收益率
- 更新该月回撤值

### 5.3 衍生指标计算公式

**年化收益率**:
```
CAGR = (1 + Total Return) ^ (365 / Days Invested) - 1
其中 Days Invested = periodEnd - periodStart（天数）
```

**波动率**:
```
1. 计算每个时间段的收益率序列: [r1, r2, ..., rn]
2. 计算平均收益率: μ = (r1 + r2 + ... + rn) / n
3. 计算方差: σ² = Σ(ri - μ)² / (n - 1)
4. 日度波动率: σ_daily = sqrt(σ²)
5. 年化波动率: σ_annual = σ_daily * sqrt(252)
```

**夏普比率**:
```
Sharpe = (Annualized Return - Risk Free Rate) / Volatility
默认无风险利率: 2.5% (0.025)
```

**最大回撤**:
```
1. 维护历史最高净值序列: [max(NAV_0), max(NAV_0, NAV_1), ...]
2. 计算每个时间点的回撤: DD_i = (NAV_i - Peak_i) / Peak_i
3. 最大回撤: MaxDD = min(DD_i)（取最小值，因为都是负数或0）
```

## 6. Data Flow

### 6.1 Frontend Request Flow
```
1. User selects period (30d) and granularity (monthly)
2. revenue-analytics.tsx triggers useRevenueHistoryQuery('30d', 'monthly')
3. React Query calls fetchRevenueHistory('30d', 'monthly')
4. assetService.get() fetches from /api/asset/account/revenue/history
5. Cache response for 5 minutes (staleTime)
```

### 6.2 Backend Processing Flow
```
1. Route handler validates user session
2. Extracts period and granularity from query params
3. Performs input validation with Zod schemas
4. Calls assetService.getRevenueHistoryData(accountId, period, granularity)
5. Service layer:
   a. Queries transactions and positions from database
   b. Calculates daily net value for each point in time
   c. Aggregates data by the specified granularity (weekly/monthly)
   d. Calculates derived metrics (CAGR, Sharpe, Volatility, MaxDD)
   e. Returns structured response
6. Controller wraps response in success/error format
```

## 7. Performance Optimizations

### 7.1 Database Query Optimization
- 使用 Drizzle ORM 的索引优化：确保 `accountId`, `created_at` 有索引
- 批量查询交易记录，避免 N+1 问题
- 考虑使用 `WITH` (CTE) 子查询优化复杂聚合

### 7.2 Client-Side Caching
- React Query 缓存时长：5 分钟
- 缓存键格式：`['revenue-history', period, granularity]`
- 手动缓存更新：当有新交易时，invalidate 相关查询

### 7.3 Computational Efficiency
- 使用 Decimal.js 避免浮点数精度问题
- 预计算常用衍生指标（如年化收益率）
- 考虑添加数据快照表用于长期数据（未来优化）

## 8. Error Handling

### 8.1 Backend Error Handling
- 数据库查询失败：返回 generic error with code 'DATABASE_QUERY_ERROR'
- 无交易记录：返回 success with empty data array
- 无效参数：返回 validation error with field details
- 用户未登录：返回 401 with code 'UNAUTHORIZED'

### 8.2 Frontend Error Handling
- 加载状态：显示 Skeleton
- 错误状态：显示错误卡片 + "请稍后重试" 按钮
- 空数据状态：显示"暂无数据"卡片

## 9. Testing Strategy

### 9.1 Unit Tests
- 测试金融计算函数（CAGR, Volatility, Sharpe, MaxDD）
- 测试数据聚合逻辑（周/月级别）
- 测试边界条件（零值、空数组、极端值）

### 9.2 Integration Tests
- 测试 API 端点的完整请求-响应流程
- 测试不同 period 和 granularity 的组合
- 测试错误场景（无效用户、无效参数）

### 9.3 E2E Tests
- 测试用户界面的完整交互流程
- 测试图表渲染和数据更新
- 测试时间范围切换

## 10. Deployment Checklist

- [ ] 更新类型定义
- [ ] 实现后端服务层和工具函数
- [ ] 创建新的 API 路由
- [ ] 更新前端服务和 hooks
- [ ] 修改 revenue-analytics 组件
- [ ] 添加单元测试
- [ ] 添加集成测试
- [ ] 验证 OpenSpec 规格
- [ ] 更新文档（如有）