import z from 'zod';

/**
 * Position Schema
 */
export const PositionSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  symbol: z.string(),
  chineseName: z.string().nullable().optional(),
  quantity: z.number().positive(),
  averageCost: z.number().positive(),
  currentPrice: z.number().positive(),
  marketValue: z.number(),
  marketValueUSD: z.number().optional(), // USD 转换后的市值（用于跨币种聚合）
  unrealizedPnL: z.number(),
  unrealizedPnLUSD: z.number().optional(), // USD 转换后的未实现盈亏
  positionRatio: z.number().optional(), // 持仓占比（基于 USD 总值计算）
  market: z.enum(['US', 'CN', 'HK']).optional(),
  currency: z.string().optional(), // 计价货币：USD, CNY, HKD 等
  sector: z.enum(['stock', 'etf', 'fund', 'crypto']).optional(), // 资产类型
  investmentMemo: z.string().nullable().optional(),
  assetMetaId: z.number().nullable().optional(), // 添加 assetMetaId 字段
  logoUrl: z.string().nullable().optional(), // 添加 logoUrl 字段
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PositionType = z.infer<typeof PositionSchema>;
