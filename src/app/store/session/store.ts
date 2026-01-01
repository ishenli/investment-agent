import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { StateCreator } from 'zustand/vanilla';

import { SessionStoreState, initialState } from './initialState';
import { SessionAction, createSessionSlice } from './slices/session/action';
import { SessionGroupAction, createSessionGroupSlice } from './slices/sessionGroup/action';

//  ===============  聚合 createStoreFn ============ //

export interface SessionStore extends SessionAction, SessionGroupAction, SessionStoreState {}

const createStore: StateCreator<SessionStore, [['zustand/devtools', never]]> = (...parameters) => ({
  ...initialState,
  ...createSessionSlice(...parameters),
  ...createSessionGroupSlice(...parameters),
});

//  ===============  implement useStore ============ //

export const useSessionStore = createWithEqualityFn<SessionStore>()(
  subscribeWithSelector(devtools(createStore)),
  shallow,
);

export const getSessionStoreState = () => useSessionStore.getState();
