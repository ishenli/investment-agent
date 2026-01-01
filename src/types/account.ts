import { z } from 'zod';

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
  isActive: z.boolean(),
});

export type TradingAccountType = z.infer<typeof TradingAccountSchema>;

/**
 * revenue Metric Schema
 */
export const revenueMetricSchema = z.object({
  accountId: z.string(),
  periodStart: z.date(),
  periodEnd: z.date(),
  realizedProfitAmount: z.number(), // 已实现收益金额
  realizedProfitRate: z.number(), // 已实现收益率(%)
  unrealizedProfitAmount: z.number(), // 未实现收益金额
  unrealizedProfitRate: z.number(), // 未实现收益率(%)
  winRate: z.number().min(0).max(100),
  totalTrades: z.number().nonnegative(),
  profitableTrades: z.number().nonnegative(),
  createdAt: z.date(),
});

export type revenueMetricType = z.infer<typeof revenueMetricSchema>;

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
