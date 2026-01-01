import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { StateCreator } from 'zustand/vanilla';

import { devtools } from 'zustand/middleware';
import { AgentStoreState, initialState } from './initialState';
import { AgentChatAction, createChatSlice } from './slices/chat/action';

//  ===============  aggregate createStoreFn ============ //

export interface AgentStore extends AgentChatAction, AgentStoreState {}

const createStore: StateCreator<AgentStore, [['zustand/devtools', never]]> = (...parameters) => ({
  ...initialState,
  ...createChatSlice(...parameters),
});

//  ===============  implement useStore ============ //

export const useAgentStore = createWithEqualityFn<AgentStore>()(devtools(createStore), shallow);

export const getAgentStoreState = () => useAgentStore.getState();
