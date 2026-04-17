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
  stockAccountValue: number; // USD 股票市值
  cashBalance: number; // USD 现金余额
  totalBalance: number; // 总资产（USD 计价）
  totalInvestment: number;
  stockAllocationPercent: number;
  cashAllocationPercent: number;
  stockGain: number; // USD 股票盈亏
  stockReturnRate: number; // 股票收益率
  totalReturnRate: number; // 总收益率
  
  // 按币种分组的现金余额
  usdCashBalance?: number; // 美元现金余额
  cnyCashBalance?: number; // 人民币现金余额
  
  // 按币种分组的股票资产
  usdStockValue?: number; // 美元股票市值
  usdStockGain?: number; // 美元股票盈亏
  usdStockReturnRate?: number; // 美元股票收益率
  cnyStockValue?: number; // 人民币资产总市值（CNY）
  cnyTotalInvestment?: number; // 人民币资产总投资额（CNY）
  cnyStockGain?: number; // 人民币资产浮动盈亏（CNY）
  cnyStockReturnRate?: number; // 人民币资产收益率
  
  // 人民币资产换算为美元后的值
  cnyStockValueInUsd?: number; // 人民币资产市值换算为美元
  cnyCashBalanceInUsd?: number; // 人民币现金换算为美元
  
  hasCnyAssets?: boolean; // 是否有人民币资产
  hasCnyCash?: boolean; // 是否有人民币现金
}
