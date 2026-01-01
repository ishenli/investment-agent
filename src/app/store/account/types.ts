import { AccountSettingsState } from './slices/settings/initialState';
import { AccountSettingsAction } from './slices/settings/action';
import { AccountCreateState } from './slices/create/initialState';
import { AccountCreateAction } from './slices/create/action';

export type RiskMode = 'retail' | 'advanced';

export type AccountStore = AccountSettingsState &
  AccountSettingsAction &
  AccountCreateState &
  AccountCreateAction;
