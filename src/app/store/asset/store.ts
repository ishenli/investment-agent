import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { StateCreator } from 'zustand/vanilla';

import { initialState } from './initialState';
import { createDevtools } from '../middleware/createDevtools';
import { createAssetAccountSlice } from './slices/account/action';
import { createAssetTransactionsSlice } from './slices/transactions/action';
import { createAssetrevenueSlice } from './slices/revenue/action';
import { createAssetSummarySlice } from './slices/summary/action';
import { AssetStore } from './types';

//  ===============  aggregate createStoreFn ============ //

const createStore: StateCreator<AssetStore, [['zustand/devtools', never]]> = (...parameters) => ({
  ...initialState,
  ...createAssetAccountSlice(...parameters),
  ...createAssetTransactionsSlice(...parameters),
  ...createAssetrevenueSlice(...parameters),
  ...createAssetSummarySlice(...parameters),
});

const devtools = createDevtools('asset');

export const useAssetStore = createWithEqualityFn<AssetStore>()(devtools(createStore), shallow);

export const getAssetStoreState = () => useAssetStore.getState();
