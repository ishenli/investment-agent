import { ProviderModel } from '@/types/modelProvider';

export interface ModelsState {
  models: ProviderModel[];
  providerId: number | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
}

export const initialModelsState: ModelsState = {
  models: [],
  providerId: null,
  loading: false,
  error: null,
  saving: false,
};