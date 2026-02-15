import { ModelProvider, ProviderModel } from '@/types/modelProvider';

export type FormMode = 'create' | 'edit' | 'model-create' | 'model-edit' | 'view';

export interface FormState {
  mode: FormMode;
  draftProvider: Partial<ModelProvider>;
  draftModel: Partial<ProviderModel>;
  isDirty: boolean;
  errors: Record<string, string>;
}

export const initialFormState: FormState = {
  mode: 'view',
  draftProvider: {},
  draftModel: {},
  isDirty: false,
  errors: {},
};