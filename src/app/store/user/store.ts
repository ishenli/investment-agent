import { StateCreator } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { initialState, UserState } from './initialState';
import { CommonAction, createCommonSlice } from './slices/common/action';
import { createPreferenceSlice, PreferenceAction } from './slices/preference/action';

export type UserStore = UserState & PreferenceAction & CommonAction;

const createStore: StateCreator<UserStore, [['zustand/devtools', never]]> = (...parameters) => ({
  ...initialState,
  ...createPreferenceSlice(...parameters),
  ...createCommonSlice(...parameters),
});

export const useUserStore = createWithEqualityFn<UserStore>()(
  subscribeWithSelector(devtools(createStore)),
  shallow,
);

export const getUserStoreState = () => useUserStore.getState();
