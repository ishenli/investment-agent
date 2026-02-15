import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { StateCreator } from 'zustand/vanilla';
import { AIProviderStoreState, initialState } from './initialState';
import { AiProviderAction, createAiProviderSlice } from './slices/aiProvider';
import { devtools } from 'zustand/middleware';

// ===============  聚合 State 和 Action ============ //

export type AiInfraStore = AIProviderStoreState & AiProviderAction;

const createStore: StateCreator<AiInfraStore, [['zustand/devtools', never]]> = (...parameters) => ({
  ...initialState,
  ...createAiProviderSlice(...parameters),
});

// ===============  实装 useStore ============ //
export const useAiInfraStore = createWithEqualityFn<AiInfraStore>()(devtools(createStore), shallow);

export const getAiInfraStoreState = () => useAiInfraStore.getState();
