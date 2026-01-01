import { TradingAccountType } from '@typings/account';
import { RiskMode } from '@renderer/store/account/types';

export interface AccountSettingsState {
  account: TradingAccountType | null;
  accounts: TradingAccountType[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  showSwitchAccountDialog: boolean;
}

export const initialAccountSettingsState: AccountSettingsState = {
  account: null,
  accounts: [],
  loading: false,
  saving: false,
  error: null,
  showSwitchAccountDialog: false,
};
