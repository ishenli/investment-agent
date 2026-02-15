import { produce } from 'immer';
import { StateCreator } from 'zustand/vanilla';
import { ModelProviderStore } from '../../store';
import { ModelProvider } from '@/types/modelProvider';

export interface ProvidersAction {
  fetchProviders: () => Promise<void>;
  createProvider: (provider: Partial<ModelProvider> & Pick<ModelProvider, 'name' | 'slug' | 'baseUrl'>) => Promise<void>;
  updateProvider: (id: number, provider: Partial<ModelProvider>) => Promise<void>;
  deleteProvider: (id: number) => Promise<void>;
  setProviderActive: (id: number, isActive: boolean) => Promise<void>;
  setActiveProvider: (id: number | null) => void;
  setProvidersLoading: (loading: boolean) => void;
  setProvidersError: (error: string | null) => void;
}

export const createProvidersSlice: StateCreator<
  ModelProviderStore,
  [['zustand/devtools', never]],
  [],
  ProvidersAction
> = (set, get) => ({
  fetchProviders: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/model-providers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();

      if (result.success) {
        set({ providers: result.data, loading: false });
      } else {
        set({ error: result.error?.message || '获取服务商列表失败', loading: false });
      }
    } catch (error) {
      set({ error: '网络错误', loading: false });
    }
  },

  createProvider: async (provider) => {
    set({ saving: true, error: null });
    try {
      const response = await fetch('/api/model-providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(provider),
      });
      const result = await response.json();

      if (result.success) {
        set(produce((state) => {
          state.providers.push(result.data);
          state.activeProviderId = result.data.id;
          state.mode = 'view';
          state.draftProvider = {};
          state.isDirty = false;
          state.errors = {};
        }));
      } else {
        set({ error: result.error?.message || '创建服务商失败' });
      }
    } catch (error) {
      set({ error: '网络错误' });
    } finally {
      set({ saving: false });
    }
  },

  updateProvider: async (id, provider) => {
    set({ saving: true, error: null });
    try {
      const response = await fetch('/api/model-providers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...provider }),
      });
      const result = await response.json();

      if (result.success) {
        set(produce((state) => {
          const index = state.providers.findIndex((p: ModelProvider) => p.id === id);
          if (index !== -1) {
            state.providers[index] = result.data;
          }
          state.mode = 'view';
          state.draftProvider = {};
          state.isDirty = false;
          state.errors = {};
        }));
      } else {
        set({ error: result.error?.message || '更新服务商失败' });
      }
    } catch (error) {
      set({ error: '网络错误' });
    } finally {
      set({ saving: false });
    }
  },

  deleteProvider: async (id) => {
    set({ saving: true, error: null });
    try {
      const response = await fetch('/api/model-providers', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();

      if (result.success) {
        set(produce((state) => {
          state.providers = state.providers.filter((p: ModelProvider) => p.id !== id);
          if (state.activeProviderId === id) {
            state.activeProviderId = null;
            state.models = [];
            state.providerId = null;
          }
          state.mode = 'view';
        }));
      } else {
        set({ error: result.error?.message || '删除服务商失败' });
      }
    } catch (error) {
      set({ error: '网络错误' });
    } finally {
      set({ saving: false });
    }
  },

  setProviderActive: async (id, isActive) => {
    set({ saving: true, error: null });
    try {
      const response = await fetch('/api/model-providers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, isActive }),
      });
      const result = await response.json();

      if (result.success) {
        set(produce((state) => {
          const provider = state.providers.find((p: ModelProvider) => p.id === id);
          if (provider) {
            provider.isActive = isActive;
          }
        }));
      } else {
        set({ error: result.error?.message || '更新状态失败' });
      }
    } catch (error) {
      set({ error: '网络错误' });
    } finally {
      set({ saving: false });
    }
  },

  setActiveProvider: (id) => {
    set({ activeProviderId: id });
  },

  setProvidersLoading: (loading) => {
    set({ loading });
  },

  setProvidersError: (error) => {
    set({ error });
  },
});