import { revenueMetricType } from '@typings/account';

export interface AssetRevenueState {
  metrics: revenueMetricType | null;
  revenueLoading: boolean;
  revenueError: string | null;
}

export const initialAssetRevenueState: AssetRevenueState = {
  metrics: null,
  revenueLoading: false,
  revenueError: null,
};
