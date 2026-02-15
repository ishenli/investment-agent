import { StateCreator } from 'zustand/vanilla';
import { ModelProviderStore } from '../../store';
import { FormMode, ModelProvider } from '@/types/modelProvider';

export interface FormAction {
  resetForm: () => void;
  setDraftProvider: (provider: any) => void;
  setDraftModel: (model: any) => void;
  setFormMode: (mode: FormMode) => void;
  setFormError: (field: string, error: string) => void;
  clearFormError: (field: string) => void;
}

export const createFormSlice: StateCreator<
  ModelProviderStore,
  [['zustand/devtools', never]],
  [],
  FormAction
> = (set, get) => ({
  resetForm: () => {
    set({
      mode: 'view',
      draftProvider: {},
      draftModel: {},
      isDirty: false,
      errors: {},
    });
  },

  setDraftProvider: (provider) => {
    set((state) => ({
      draftProvider: { ...state.draftProvider, ...provider },
      isDirty: true,
    }));
  },

  setDraftModel: (model) => {
    set((state) => ({
      draftModel: { ...state.draftModel, ...model },
      isDirty: true,
    }));
  },

  setFormMode: (mode) => {
    const { activeProviderId } = get();
    set({ mode });

    if (mode === 'edit' && activeProviderId) {
      const { providers } = get();
      const provider = providers.find((p: ModelProvider) => p.id === activeProviderId);
      if (provider) {
        set({ draftProvider: { ...provider } });
      }
    }
  },

  setFormError: (field, error) => {
    set((state) => ({
      errors: { ...state.errors, [field]: error },
    }));
  },

  clearFormError: (field) => {
    set((state) => {
      const newErrors = { ...state.errors };
      delete newErrors[field];
      return { errors: newErrors };
    });
  },
});