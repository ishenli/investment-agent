import { TradingAccountType } from '@typings/account';

export interface AssetAccountState {
  account: TradingAccountType | null;
  accounts: TradingAccountType[];
  accountLoading: boolean;
  accountSaving: boolean;
  accountError: string | null;
}

export const initialAssetAccountState: AssetAccountState = {
  account: null,
  accounts: [],
  accountLoading: false,
  accountSaving: false,
  accountError: null,
};
