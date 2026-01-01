import { StateCreator } from 'zustand';
import { AssetStore } from '../../types';
import { AssetSummaryType } from '@typings/asset';

export interface AssetSummaryAction {
  fetchSummary: (accountId: string) => Promise<void>;
  setSummaryLoading: (loading: boolean) => void;
  setSummaryError: (error: string | null) => void;
}

export const createAssetSummarySlice: StateCreator<
  AssetStore,
  [['zustand/devtools', never]],
  [],
  AssetSummaryAction
> = (set, get) => ({
  fetchSummary: async () => {
    set((state: AssetStore) => ({
      ...state,
      summaryLoading: true,
      summaryError: null,
    }));
    try {
      const response = await fetch(`/api/asset/account/summary`);
      if (!response.ok) {
        throw new Error('Failed to fetch asset summary');
      }
      const res = await response.json();
      const summaryData = res.data.summary as AssetSummaryType;
      set((state: AssetStore) => ({
        ...state,
        stockAccountValue: summaryData.stockAccountValue,
        cashBalance: summaryData.cashBalance,
        totalBalance: summaryData.totalBalance,
        totalInvestment: summaryData.totalInvestment,
        stockAllocationPercent: summaryData.stockAllocationPercent,
        cashAllocationPercent: summaryData.cashAllocationPercent,
        stockGain: summaryData.stockGain || 0,
        stockReturnRate: summaryData.stockReturnRate || 0, // 股票收益率
        totalReturnRate: summaryData.totalReturnRate || 0, // 总收益率
        summaryLoading: false,
      }));
    } catch (error) {
      set((state: AssetStore) => ({
        ...state,
        summaryError: (error as Error).message,
        summaryLoading: false,
      }));
    }
  },

  setSummaryLoading: (loading: boolean) => {
    set((state: AssetStore) => ({ ...state, summaryLoading: loading }));
  },

  setSummaryError: (error: string | null) => {
    set((state: AssetStore) => ({ ...state, summaryError: error }));
  },
});
