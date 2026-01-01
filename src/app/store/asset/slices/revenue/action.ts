import { StateCreator } from 'zustand';
import { revenueMetricType } from '@typings/account';
import { AssetStore } from '../../types';

export interface AssetRevenueAction {
  setMetrics: (metrics: revenueMetricType | null) => void;
  setRevenueLoading: (loading: boolean) => void;
  setRevenueError: (error: string | null) => void;
}

export const createAssetrevenueSlice: StateCreator<
  AssetStore,
  [['zustand/devtools', never]],
  [],
  AssetRevenueAction
> = (set, get) => ({
  setMetrics: (metrics: revenueMetricType | null) => {
    set((state: AssetStore) => ({ ...state, metrics }));
  },

  setRevenueLoading: (loading: boolean) => {
    set((state: AssetStore) => ({ ...state, revenueLoading: loading }));
  },

  setRevenueError: (error: string | null) => {
    set((state: AssetStore) => ({ ...state, revenueError: error }));
  },
});
