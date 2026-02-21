import { z } from 'zod';

const MARKET_ENUM = ['HK', 'CN', 'US'] as const;
const RISK_MODE_ENUM = ['retail', 'advanced'] as const;

/**
 * User Account Schema
 */
export const UserAccountSchema = z.object({
  id: z.string(),
  username: z.string().min(3).max(30),
  email: z.string().email(),
  passwordHash: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastLoginAt: z.date().optional(),
  isActive: z.boolean(),
  preferences: z
    .object({
      theme: z.enum(['light', 'dark']).optional(),
      language: z.string().optional(),
    })
    .optional(),
});

export type UserAccountType = z.infer<typeof UserAccountSchema>;

/**
 * Trading Account Schema
 */
export const TradingAccountSchema = z.object({
  id: z.string(),
  userId: z.string(),
  accountName: z.string().optional(),
  balance: z.number().min(0),
  currency: z.string().default('USD'),
  leverage: z.number().min(1).max(100).default(1),
  market: z.enum(['HK', 'CN', 'US']),
  riskMode: z.enum(['retail', 'advanced']).default('retail'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TradingAccountType = z.infer<typeof TradingAccountSchema>;

export const AccountSchema = z.object({
  id: z.string(),
  userId: z.string(),
  accountName: z.string().max(50).optional(),
  currency: z.string().default('USD'),
  leverage: z.number().min(1).max(100).default(1),
  market: z.enum(['HK', 'CN', 'US']),
  riskMode: z.enum(['retail', 'advanced']).default('retail'),
  createdAt: z.date(),
});

export type AccountType = z.infer<typeof AccountSchema>;

/**
 * Create Account Request Schema
 */
export const CreateAccountRequestSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(8),
  initialDeposit: z.number().min(0),
  market: z.enum(['US', 'CN', 'HK']).default('US'),
  leverage: z.number().min(1).max(100).default(1),
});

export type CreateAccountRequestType = z.infer<typeof CreateAccountRequestSchema>;

/**
 * Create Trading Account Request Schema
 */
export const CreateTradingAccountRequestSchema = z.object({
  initialDeposit: z.number().min(0),
  accountName: z.string().max(50).optional(),
  market: z.enum(['US', 'CN', 'HK']).default('CN'),
  leverage: z.number().min(1).max(100).default(1),
});

export const CreateTradingAccountDoSchema = CreateTradingAccountRequestSchema.extend({
  userId: z.string(),
});

export type CreateTradingAccountRequestType = z.infer<typeof CreateTradingAccountRequestSchema>;

export type CreateTradingAccountDoType = z.infer<typeof CreateTradingAccountDoSchema>;

/**
 * Update Account Request Schema
 */
export const UpdateAccountRequestSchema = z.object({
  market: z.enum(['HK', 'CN', 'US']).optional(),
  leverage: z.number().min(1).max(100).optional(),
  riskMode: z.enum(['retail', 'advanced']).optional(),
});

export type UpdateAccountRequestType = z.infer<typeof UpdateAccountRequestSchema>;

// ============================================
// Snapshot-based Revenue Types (新版本)
// ============================================

/**
 * Snapshot-based revenue period enum
 * Standard period options for portfolio performance calculation
 */
export const snapshotRevenuePeriodSchema = z.enum(['1W', '1M', '3M', '6M', 'YTD', '1Y', 'ALL']);

export type SnapshotRevenuePeriod = z.infer<typeof snapshotRevenuePeriodSchema>;

/**
 * Revenue history data point - 基于快照
 */
export const snapshotRevenueHistoryPointSchema = z.object({
  date: z.date(),
  totalValue: z.number(), // 当日总资产
  profitRate: z.number(), // 累计收益率 (%)
  dailyReturn: z.number().optional(), // 区间收益率 (%)
});

export type RevenueHistoryPoint = z.infer<typeof snapshotRevenueHistoryPointSchema>;

/**
 * Revenue History Query Schema - 基于快照计算
 */
export const revenueHistoryQuerySchema = z.object({
  period: snapshotRevenuePeriodSchema.default('1M'),
});

export type revenueHistoryQueryType = z.infer<typeof revenueHistoryQuerySchema>;

/**
 * Revenue History Response - 基于快照计算
 */
export const snapshotRevenueHistorySchema = z.object({
  accountId: z.string(),
  period: snapshotRevenuePeriodSchema,
  periodStart: z.date(),
  periodEnd: z.date(),
  data: z.array(snapshotRevenueHistoryPointSchema),
  derivedMetrics: z.object({
    annualizedReturn: z.number(),
    maxDrawdown: z.number(),
    volatility: z.number(),
    sharpeRatio: z.number(),
    totalReturn: z.number(), // 总收益率 (%)
  }),
  createdAt: z.date(),
});

export type SnapshotRevenueHistory = z.infer<typeof snapshotRevenueHistorySchema>;

/**
 * Position performance in snapshot
 */
export const positionPerformanceSchema = z.object({
  symbol: z.string(),
  quantity: z.number(),
  startValue: z.number(), // 持仓期初市值
  endValue: z.number(), // 持仓期末市值
  profitAmount: z.number(), // 收益金额
  profitRate: z.number(), // 收益率 (%)
  contribution: z.number(), // 对总收益的贡献率 (%)
  currentWeight: z.number(), // 当前持仓权重 (%)
});

export type PositionPerformance = z.infer<typeof positionPerformanceSchema>;

/**
 * Snapshot-based revenue metrics
 * Calculated from portfolio snapshots for accurate historical performance
 */
export const snapshotRevenueMetricsSchema = z.object({
  accountId: z.string(),
  period: snapshotRevenuePeriodSchema,
  periodStart: z.date(),
  periodEnd: z.date(),
  daysHeld: z.number(), // 持有天数
  // 当前快照数据
  currentSnapshot: z.object({
    date: z.date(),
    totalValue: z.number(), // 总资产
    cashBalance: z.number(), // 现金余额
    positionsValue: z.number(), // 持仓市值
  }),
  // 期初快照数据
  comparisonSnapshot: z.object({
    date: z.date(),
    totalValue: z.number(), // 期初总资产
  }),
  // 业绩指标
  performance: z.object({
    profitAmount: z.number(), // 收益金额
    profitRate: z.number(), // 收益率 (%)
    benchmarkProfitRate: z.number(), // 基准收益率 (%)
    excessReturn: z.number(), // 超额收益 (%)
    annualizedReturn: z.number(), // 年化收益率 (%)
  }),
  // 持仓明细业绩
  positions: z.array(positionPerformanceSchema),
  createdAt: z.date(),
});

export type SnapshotRevenueMetrics = z.infer<typeof snapshotRevenueMetricsSchema>;

/**
 * Snapshot revenue query schema
 */
export const snapshotRevenueQuerySchema = z.object({
  period: snapshotRevenuePeriodSchema.default('1M'),
});

export type SnapshotRevenueQueryType = z.infer<typeof snapshotRevenueQuerySchema>;