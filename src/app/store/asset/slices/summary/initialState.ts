export interface AssetSummaryState {
  stockAccountValue: number;
  cashBalance: number;
  totalBalance: number;
  totalInvestment: number;
  stockAllocationPercent: number;
  cashAllocationPercent: number;
  stockGain: number;
  stockReturnRate: number; // 股票收益率
  totalReturnRate: number; // 总收益率
  summaryLoading: boolean;
  summaryError: string | null;
}

export const initialAssetSummaryState: AssetSummaryState = {
  stockAccountValue: 0,
  cashBalance: 0,
  totalBalance: 0,
  totalInvestment: 0,
  stockAllocationPercent: 0,
  cashAllocationPercent: 0,
  stockGain: 0,
  stockReturnRate: 0, // 股票收益率
  totalReturnRate: 0, // 总收益率
  summaryLoading: false,
  summaryError: null,
};
