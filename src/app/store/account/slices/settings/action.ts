import { StateCreator } from 'zustand';
import { TradingAccountType, UpdateAccountRequestType } from '@typings/account';
import { AccountStore } from '../../types';

/**
 * 模块级防重入锁：保证 initializeAccount 全局只执行一次
 * AppSidebar 和 useAccountGuard 同时 mount 时共享同一个 Promise，
 * 避免对 /api/account 和 /api/account/selected 产生重复请求
 */
let _initializationPromise: Promise<void> | null = null;

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
    // 若已有账户数据且已选中账户，直接复用，无需网络请求
    const state = get();
    if (state.accounts.length > 0 && state.account) {
      return;
    }

    // 防重入：多处并发调用时共享同一个 Promise
    if (_initializationPromise) {
      return _initializationPromise;
    }

    _initializationPromise = (async () => {
      try {
        await get().fetchAccounts();
        await get().fetchSelectedAccount();
        const accounts = get().accounts;
        const account = get().account;

        // 如果有账户但未设置选中账号，自动选择第一个账户
        if (accounts.length > 0 && !account) {
          await get().setAccount(accounts[0]);
        }
      } finally {
        // 初始化结束后清除锁，下次可重新触发
        _initializationPromise = null;
      }
    })();

    return _initializationPromise;
  },
  fetchSelectedAccount: async () => {
    console.warn('Fetching selected account...');
    try {
      const response = await fetch('/api/account/selected');
      if (!response.ok) {
        throw new Error('Failed to fetch selected account');
      }
      const res = await response.json();
      if (res.code === 'unauthorized') {
        set((state) => ({ ...state, account: null, showSwitchAccountDialog: false }));
      } else if (res.data.selectedAccount) {
        const selectedAccount = res.data.selectedAccount;
        set((state) => ({ ...state, account: selectedAccount }));
      } else {
        set((state) => ({ ...state, account: null, showSwitchAccountDialog: false }));
      }
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
      if (res.code === 'unauthorized') {
        set((state) => ({ ...state, loading: false }));
        window.location.replace('/auth?redirect=' + encodeURIComponent(window.location.pathname));
        return;
      }
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
