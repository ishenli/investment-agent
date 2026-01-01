// import { z } from "zod";

// export const TransactionRecordSchema = z.object({
//     accountId: z.string(),
//     type: z.literal('deposit').or(z.literal('buy')).or(z.literal('sell')),

//     amount: z.number(),
//     description: z.string().optional(),
//     createdAt: z.date().optional(),
//     symbol: z.string().optional(),
// });

// export type TransactionRecordType = z.infer<typeof TransactionRecordSchema>;

export type AssetType = 'stock' | 'etf' | 'fund' | 'crypto';

export type MarketType = 'US' | 'CN' | 'HK';

export interface AssetSummaryType {
  stockAccountValue: number;
  cashBalance: number;
  totalBalance: number;
  totalInvestment: number;
  stockAllocationPercent: number;
  cashAllocationPercent: number;
  stockGain: number;
  stockReturnRate: number; // 股票收益率
  totalReturnRate: number; // 总收益率
}
