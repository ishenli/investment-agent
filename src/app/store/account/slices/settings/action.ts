import { StateCreator } from 'zustand';
import { TradingAccountType, UpdateAccountRequestType } from '@typings/account';
import { AccountStore } from '../../types';
import { produce } from 'immer';

export interface AccountSettingsAction {
  fetchAccountSettings: (accountId: string) => Promise<void>;
  fetchAccounts: () => Promise<void>;
  fetchSelectedAccount: () => Promise<void>;
  updateAccountSettings: (accountId: string, settings: UpdateAccountRequestType) => Promise<void>;
  updateAccountRiskMode: (riskMode: 'retail' | 'advanced') => Promise<void>;
  setAccount: (account: TradingAccountType | null) => Promise<void>;
  setAccounts: (accounts: TradingAccountType[]) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;
  initializeAccount: () => Promise<void>;
  setShowSwitchAccountDialog: (showSwitchAccountDialog: boolean) => void;
}

export const createAccountSettingsSlice: StateCreator<
  AccountStore,
  [['zustand/devtools', never]],
  [],
  AccountSettingsAction
> = (set, get) => ({
  initializeAccount: async () => {
    await get().fetchAccounts();
    await get().fetchSelectedAccount();
    const accounts = get().accounts;
    const account = get().account;

    // 如果有账户但未设置选中账号，自动选择第一个账户
    if (accounts.length > 0 && !account) {
      await get().setAccount(accounts[0]);
    }
  },
  fetchSelectedAccount: async () => {
    try {
      const response = await fetch('/api/account/selected');
      if (!response.ok) {
        throw new Error('Failed to fetch selected account');
      }
      const res = await response.json();
      const selectedAccount = res.data.selectedAccount;
      set((state) => ({ ...state, account: selectedAccount }));
    } catch (error) {
      console.error('Failed to fetch selected account:', error);
    }
  },
  fetchAccountSettings: async (accountId: string) => {
    set((state) => ({ ...state, loading: true, error: null }));
    try {
      const response = await fetch(`/api/account?accountId=${accountId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch account settings');
      }
      const data = await response.json();
      set((state) => ({ ...state, account: data.data, loading: false }));
    } catch (error) {
      set((state) => ({
        ...state,
        error: (error as Error).message,
        loading: false,
      }));
    }
  },

  fetchAccounts: async () => {
    set((state) => ({ ...state, loading: true, error: null }));
    try {
      const response = await fetch('/api/account');
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }
      const res = await response.json();
      set((state) => ({ ...state, accounts: res.data.items || [], loading: false }));
    } catch (error) {
      set((state) => ({
        ...state,
        error: (error as Error).message,
        loading: false,
      }));
    }
  },

  updateAccountSettings: async (accountId: string, settings: UpdateAccountRequestType) => {
    set((state) => ({ ...state, saving: true, error: null }));
    try {
      const response = await fetch(`/api/account?accountId=${accountId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to update account settings');
      }

      const data = await response.json();
      set((state) => ({ ...state, account: data.data, saving: false }));
    } catch (error) {
      set((state) => ({
        ...state,
        error: (error as Error).message,
        saving: false,
      }));
    }
  },

  updateAccountRiskMode: async (riskMode: 'retail' | 'advanced') => {
    set((state) => ({ ...state, saving: true, error: null }));
    try {
      const response = await fetch(`/api/account`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ riskMode }),
      });

      if (!response.ok) {
        throw new Error('Failed to update account risk mode');
      }

      const data = await response.json();
      set((state) => ({ ...state, account: data.data, saving: false }));
    } catch (error) {
      set((state) => ({
        ...state,
        error: (error as Error).message,
        saving: false,
      }));
    }
  },

  setAccount: async (account: TradingAccountType | null) => {
    // 保存到服务端
    if (account) {
      try {
        const response = await fetch('/api/account/selected', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ accountId: account.id }),
        });

        if (!response.ok) {
          throw new Error('Failed to save selected account');
        }
        set({
          showSwitchAccountDialog: false,
        });
      } catch (error) {
        console.error('Failed to save selected account:', error);
        // 即使服务端保存失败，我们仍然更新本地状态
      }
    }
    set((state) => ({ ...state, account }));
  },

  setAccounts: (accounts: TradingAccountType[]) => {
    set((state) => ({ ...state, accounts }));
  },

  setLoading: (loading: boolean) => {
    set((state) => ({ ...state, loading }));
  },

  setSaving: (saving: boolean) => {
    set((state) => ({ ...state, saving }));
  },

  setError: (error: string | null) => {
    set((state) => ({ ...state, error }));
  },
  setShowSwitchAccountDialog: (showSwitchAccountDialog: boolean) => {
    set((state) => ({ ...state, showSwitchAccountDialog }));
  },
});
