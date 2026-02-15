import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { StateCreator } from 'zustand/vanilla';
import { devtools } from 'zustand/middleware';
import { initialState, ModelProviderStoreState } from './initialState';
import { createProvidersSlice, ProvidersAction } from './slices/providers/action';
import { createModelsSlice, ModelsAction } from './slices/models/action';
import { createFormSlice, FormAction } from './slices/form/action';

export interface ModelProviderStore
  extends ModelProviderStoreState,
    ProvidersAction,
    ModelsAction,
    FormAction {}

const createStore: StateCreator<ModelProviderStore, [['zustand/devtools', never]]> = (
  ...parameters
) => ({
  ...initialState,
  ...createProvidersSlice(...parameters),
  ...createModelsSlice(...parameters),
  ...createFormSlice(...parameters),
});

export const useModelProviderStore = createWithEqualityFn<ModelProviderStore>()(
  devtools(createStore, { name: 'ModelProviderStore' }),
  shallow,
);

export const getModelProviderState = () => useModelProviderStore.getState();