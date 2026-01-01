import { TradingAccountType } from '@typings/account';

export interface AccountCreateState {
  createdAccount: TradingAccountType | null;
  creating: boolean;
  error: string | null;
}

export const initialAccountCreateState: AccountCreateState = {
  createdAccount: null,
  creating: false,
  error: null,
};
