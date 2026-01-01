import { StateCreator } from 'zustand';
import { TradingAccountType, CreateTradingAccountRequestType } from '@typings/account';
import { AccountStore } from '../../types';
import { produce } from 'immer';

export interface AccountCreateAction {
  createAccount: (accountData: CreateTradingAccountRequestType) => Promise<TradingAccountType | null>;
  setCreatedAccount: (account: TradingAccountType | null) => void;
  setCreating: (creating: boolean) => void;
  setError: (error: string | null) => void;
}

export const createAccountCreateSlice: StateCreator<
  AccountStore,
  [['zustand/devtools', never]],
  [],
  AccountCreateAction
> = (set, get) => ({
  createAccount: async (accountData: CreateTradingAccountRequestType) => {
    set((state) => ({ ...state, creating: true, error: null }));
    try {
      // 创建交易账户
      const response = await fetch('/api/account/trading', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(accountData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create account');
      }

      const data = await response.json();
      set((state) => ({
        ...state,
        createdAccount: data.data,
        creating: false,
      }));
      return data.data;
    } catch (error) {
      set((state) => ({
        ...state,
        error: (error as Error).message,
        creating: false,
      }));
      return null;
    }
  },

  setCreatedAccount: (account: TradingAccountType | null) => {
    set((state) => ({ ...state, createdAccount: account }));
  },

  setCreating: (creating: boolean) => {
    set((state) => ({ ...state, creating }));
  },

  setError: (error: string | null) => {
    set((state) => ({ ...state, error }));
  },
});
