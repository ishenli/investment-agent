import { SnapshotRevenueMetrics } from '@typings/account';

export interface AssetRevenueState {
  metrics: SnapshotRevenueMetrics | null;
  revenueLoading: boolean;
  revenueError: string | null;
}

export const initialAssetRevenueState: AssetRevenueState = {
  metrics: null,
  revenueLoading: false,
  revenueError: null,
};
