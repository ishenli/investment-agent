import { AssetStore } from '../../types';

export const assetSummarySelectors = {
  summary: (state: AssetStore) => ({
    stockAccountValue: state.stockAccountValue || 0,
    cashBalance: state.cashBalance || 0,
    totalBalance: state.totalBalance || 0,
    totalInvestment: state.totalInvestment || 0,
    stockAllocationPercent: state.stockAllocationPercent || 0,
    cashAllocationPercent: state.cashAllocationPercent || 0,
    stockGain: state.stockGain || 0,
  }),
  loading: (state: AssetStore) => state.summaryLoading || false,
  error: (state: AssetStore) => state.summaryError || null,
};
