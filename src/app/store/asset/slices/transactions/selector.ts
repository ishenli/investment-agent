import { AssetStore } from '../../types';

export const assetTransactionsSelectors = {
  transactions: (state: AssetStore) => state.transactions,
  totalCount: (state: AssetStore) => state.totalCount,
  loading: (state: AssetStore) => state.transactionsLoading,
  error: (state: AssetStore) => state.transactionsError,
};
