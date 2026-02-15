import { initialProvidersState, ProvidersState } from './slices/providers/initialState';
import { initialModelsState, ModelsState } from './slices/models/initialState';
import { initialFormState, FormState } from './slices/form/initialState';

export interface ModelProviderStoreState extends ProvidersState, ModelsState, FormState {}

export const initialState: ModelProviderStoreState = {
  ...initialProvidersState,
  ...initialModelsState,
  ...initialFormState,
};