import { StateCreator } from 'zustand';
import {
  TradingAccountType,
  CreateTradingAccountRequestType,
  UpdateAccountRequestType,
} from '@typings/account';
import { AssetStore } from '../../types';
import { produce } from 'immer';

export interface AssetAccountAction {
  fetchAccount: (accountId: string) => Promise<void>;
  fetchAccounts: (userId: string) => Promise<void>;
  createAccount: (
    accountData: CreateTradingAccountRequestType,
  ) => Promise<TradingAccountType | null>;
  updateAccount: (accountId: string, settings: UpdateAccountRequestType) => Promise<void>;
  setAccount: (account: TradingAccountType | null) => void;
  setAccounts: (accounts: TradingAccountType[]) => void;
  setAccountLoading: (loading: boolean) => void;
  setAccountSaving: (saving: boolean) => void;
  setAccountError: (error: string | null) => void;
}

export const createAssetAccountSlice: StateCreator<
  AssetStore,
  [['zustand/devtools', never]],
  [],
  AssetAccountAction
> = (set, get) => ({
  fetchAccount: async () => {
    set((state: AssetStore) => ({
      ...state,
      accountLoading: true,
      accountError: null,
    }));
    try {
      const response = await fetch(`/api/asset/account`);
      if (!response.ok) {
        throw new Error('Failed to fetch account');
      }
      const data = await response.json();
      set((state: AssetStore) => ({
        ...state,
        account: data.data,
        accountLoading: false,
      }));
    } catch (error) {
      set((state: AssetStore) => ({
        ...state,
        accountError: (error as Error).message,
        accountLoading: false,
      }));
    }
  },

  fetchAccounts: async (userId: string) => {
    set((state: AssetStore) => ({
      ...state,
      accountLoading: true,
      accountError: null,
    }));
    try {
      // This would need to be implemented in the API
      // For now, we'll just set an empty array
      set((state: AssetStore) => ({
        ...state,
        accounts: [],
        accountLoading: false,
      }));
    } catch (error) {
      set((state: AssetStore) => ({
        ...state,
        accountError: (error as Error).message,
        accountLoading: false,
      }));
    }
  },

  createAccount: async (accountData: CreateTradingAccountRequestType) => {
    set((state: AssetStore) => ({
      ...state,
      accountSaving: true,
      accountError: null,
    }));
    try {
      const response = await fetch('/api/asset/account', {
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
      set((state: AssetStore) => ({
        ...state,
        account: data.data,
        accountSaving: false,
      }));
      return data.data;
    } catch (error) {
      set((state: AssetStore) => ({
        ...state,
        accountError: (error as Error).message,
        accountSaving: false,
      }));
      return null;
    }
  },

  updateAccount: async (accountId: string, settings: UpdateAccountRequestType) => {
    set((state: AssetStore) => ({
      ...state,
      accountSaving: true,
      accountError: null,
    }));
    try {
      const response = await fetch(`/api/asset/account`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to update account');
      }

      const data = await response.json();
      set((state: AssetStore) => ({
        ...state,
        account: data.data,
        accountSaving: false,
      }));
    } catch (error) {
      set((state: AssetStore) => ({
        ...state,
        accountError: (error as Error).message,
        accountSaving: false,
      }));
    }
  },

  setAccount: (account: TradingAccountType | null) => {
    set((state: AssetStore) => ({ ...state, account }));
  },

  setAccounts: (accounts: TradingAccountType[]) => {
    set((state: AssetStore) => ({ ...state, accounts }));
  },

  setAccountLoading: (loading: boolean) => {
    set((state: AssetStore) => ({ ...state, accountLoading: loading }));
  },

  setAccountSaving: (saving: boolean) => {
    set((state: AssetStore) => ({ ...state, accountSaving: saving }));
  },

  setAccountError: (error: string | null) => {
    set((state: AssetStore) => ({ ...state, accountError: error }));
  },
});
