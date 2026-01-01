import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { StateCreator } from 'zustand/vanilla';

import { AccountStoreState, initialState } from './initialState';
import { createDevtools } from '../middleware/createDevtools';
import { createAccountSettingsSlice, AccountSettingsAction } from './slices/settings/action';
import { createAccountCreateSlice, AccountCreateAction } from './slices/create/action';
import { AccountStore } from './types';
import { TradingAccountType } from '@typings/account';

//  ===============  aggregate createStoreFn ============ //

const createStore: StateCreator<AccountStore, [['zustand/devtools', never]]> = (...parameters) => ({
  ...initialState,
  ...createAccountSettingsSlice(...parameters),
  ...createAccountCreateSlice(...parameters),
});

const devtools = createDevtools('account');

export const useAccountStore = createWithEqualityFn<AccountStore>()(devtools(createStore), shallow);

export const getAccountStoreState = () => useAccountStore.getState();
