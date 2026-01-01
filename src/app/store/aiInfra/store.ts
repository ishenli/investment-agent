import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { StateCreator } from 'zustand/vanilla';
import { AIProviderStoreState, initialState } from './initialState';
// import { createAiModelSlice } from './slices/aiModel';
import { devtools } from 'zustand/middleware';

//  ===============  聚合 createStoreFn ============ //

export type AiInfraStore = AIProviderStoreState;

const createStore: StateCreator<AiInfraStore, [['zustand/devtools', never]]> = (...parameters) => ({
  ...initialState,
  // ...createAiModelSlice(...parameters),
});

//  ===============  实装 useStore ============ //
export const useAiInfraStore = createWithEqualityFn<AiInfraStore>()(devtools(createStore), shallow);

export const getAiInfraStoreState = () => useAiInfraStore.getState();
