import { produce } from 'immer';
import { StateCreator } from 'zustand/vanilla';
import { ModelProviderStore } from '../../store';
import { ProviderModel } from '@/types/modelProvider';

export interface ModelsAction {
  fetchModels: (providerId: number) => Promise<void>;
  createModel: (model: Partial<ProviderModel> & Pick<ProviderModel, 'slug' | 'name'>) => Promise<void>;
  updateModel: (id: number, model: Partial<ProviderModel>) => Promise<void>;
  deleteModel: (id: number) => Promise<void>;
  setModelActive: (id: number, isActive: boolean) => Promise<void>;
  setModelsLoading: (loading: boolean) => void;
  setModelsError: (error: string | null) => void;
}

export const createModelsSlice: StateCreator<
  ModelProviderStore,
  [['zustand/devtools', never]],
  [],
  ModelsAction
> = (set, get) => ({
  fetchModels: async (providerId) => {
    set({ loading: true, error: null, providerId });
    try {
      const response = await fetch(`/api/model-providers/${providerId}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();

      if (result.success) {
        set({ models: result.data, loading: false });
      } else {
        set({ error: result.error?.message || '获取模型列表失败', loading: false });
      }
    } catch (error) {
      set({ error: '网络错误', loading: false });
    }
  },

  createModel: async (model) => {
    set({ saving: true, error: null });
    try {
      const providerId = get().providerId;
      if (!providerId) {
        set({ error: '请先选择服务商' });
        return;
      }

      const response = await fetch(`/api/model-providers/${providerId}/models`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ providerId, ...model }),
      });
      const result = await response.json();

      if (result.success) {
        set(produce((state) => {
          state.models.push(result.data);
          state.mode = 'view';
          state.draftModel = {};
          state.isDirty = false;
          state.errors = {};
        }));
      } else {
        set({ error: result.error?.message || '创建模型失败' });
      }
    } catch (error) {
      set({ error: '网络错误' });
    } finally {
      set({ saving: false });
    }
  },

  updateModel: async (id, model) => {
    set({ saving: true, error: null });
    try {
      const response = await fetch('/api/model-providers/1/models', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...model }),
      });
      const result = await response.json();

      if (result.success) {
        set(produce((state) => {
          const index = state.models.findIndex((m: ProviderModel) => m.id === id);
          if (index !== -1) {
            state.models[index] = result.data;
          }
          state.mode = 'view';
          state.draftModel = {};
          state.isDirty = false;
          state.errors = {};
        }));
      } else {
        set({ error: result.error?.message || '更新模型失败' });
      }
    } catch (error) {
      set({ error: '网络错误' });
    } finally {
      set({ saving: false });
    }
  },

  deleteModel: async (id) => {
    set({ saving: true, error: null });
    try {
      const response = await fetch('/api/model-providers/1/models', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();

      if (result.success) {
        set(produce((state) => {
          state.models = state.models.filter((m: ProviderModel) => m.id !== id);
          state.mode = 'view';
        }));
      } else {
        set({ error: result.error?.message || '删除模型失败' });
      }
    } catch (error) {
      set({ error: '网络错误' });
    } finally {
      set({ saving: false });
    }
  },

  setModelActive: async (id, isActive) => {
    try {
      const response = await fetch('/api/model-providers/1/models', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, isActive }),
      });
      const result = await response.json();

      if (result.success) {
        set(produce((state) => {
          const index = state.models.findIndex((m: ProviderModel) => m.id === id);
          if (index !== -1) {
            state.models[index] = result.data;
          }
        }));
      }
    } catch (error) {
      // Silently fail for toggle, could add toast notification here
    }
  },

  setModelsLoading: (loading) => {
    set({ loading });
  },

  setModelsError: (error) => {
    set({ error });
  },
});