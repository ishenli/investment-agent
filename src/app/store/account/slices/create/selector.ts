import { AccountStore } from '../../types';

export const accountCreateSelectors = {
  createdAccount: (state: AccountStore) => state.createdAccount,
  creating: (state: AccountStore) => state.creating,
  error: (state: AccountStore) => state.error,
};
