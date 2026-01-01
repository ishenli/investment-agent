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
  unrealizedPnL: z.number(),
  positionRatio: z.number().optional(), // 持仓占比
  market: z.enum(['US', 'CN', 'HK']).optional(),
  investmentMemo: z.string().nullable().optional(),
  assetMetaId: z.number().nullable().optional(), // 添加 assetMetaId 字段
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PositionType = z.infer<typeof PositionSchema>;
