import { AccountSettingsState, initialAccountSettingsState } from './slices/settings/initialState';
import { AccountCreateState, initialAccountCreateState } from './slices/create/initialState';

export type AccountStoreState = AccountSettingsState & AccountCreateState;

export const initialState: AccountStoreState = {
  ...initialAccountSettingsState,
  ...initialAccountCreateState,
};
