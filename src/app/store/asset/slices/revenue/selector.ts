import { AssetStore } from '../../types';

export const assetRevenueSelectors = {
  metrics: (state: AssetStore) => state.metrics,
  loading: (state: AssetStore) => state.revenueLoading,
  error: (state: AssetStore) => state.revenueError,
};
