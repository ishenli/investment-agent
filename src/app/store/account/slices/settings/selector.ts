import { AccountStore } from '../../types';

export const accountSettingsSelectors = {
  account: (state: AccountStore) => state.account,
  loading: (state: AccountStore) => state.loading,
  saving: (state: AccountStore) => state.saving,
  error: (state: AccountStore) => state.error,
};
