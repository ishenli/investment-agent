import { StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';
import type { AuthUser } from '@/types/auth';

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export interface AuthActions {
  setAuth: (user: AuthUser, token: string) => void;
  setToken: (token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  checkAuth: () => Promise<void>;
}

const TOKEN_STORAGE_KEY = 'auth_token';

export type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null,
  loading: false,
  error: null,
};

const createStore: StateCreator<AuthStore, [['zustand/devtools', never]]> = (set, get) => ({
  ...initialState,

  setAuth: (user, token) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    set({ isAuthenticated: true, user, token, error: null });
  },

  setToken: (token) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    set({ token });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    // 清除 cookie
    document.cookie = 'auth_token=; path=/; max-age=0; secure; samesite=lax';
    set({ isAuthenticated: false, user: null, token: null, error: null });
  },

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  checkAuth: async () => {
    const { token } = get();
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }

    set({ loading: true, error: null });

    try {
      const response = await fetch('/api/auth/check', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.isAuthenticated) {
          set({
            isAuthenticated: true,
            user: data.data.user,
            error: null,
          });
        } else {
          set({ isAuthenticated: false, user: null });
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          document.cookie = 'auth_token=; path=/; max-age=0; secure; samesite=lax';
        }
      } else {
        set({ isAuthenticated: false, user: null });
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        document.cookie = 'auth_token=; path=/; max-age=0; secure; samesite=lax';
      }
    } catch (error) {
      console.error('检查认证状态失败:', error);
      set({ isAuthenticated: false, user: null });
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      document.cookie = 'auth_token=; path=/; max-age=0; secure; samesite=lax';
    } finally {
      set({ loading: false });
    }
  },
});

export const useAuthStore = createWithEqualityFn<AuthStore>()(
  devtools(createStore, { name: 'AuthStore' }),
  shallow,
);

export const getAuthStoreState = () => useAuthStore.getState();
