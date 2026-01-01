import { AssetStore } from '../../types';

export const assetAccountSelectors = {
  account: (state: AssetStore) => state.account,
  accounts: (state: AssetStore) => state.accounts,
  loading: (state: AssetStore) => state.accountLoading,
  saving: (state: AssetStore) => state.accountSaving,
  error: (state: AssetStore) => state.accountError,
};
