import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { StateCreator } from 'zustand/vanilla';

import { StockStoreState, initialState } from './initialState';
import { createDevtools } from '../middleware/createDevtools';
import { createStockChatSlice, StockChatAction } from './slices/chat/action';

//  ===============  aggregate createStoreFn ============ //

export type StockStore = StockStoreState & StockChatAction;

const createStore: StateCreator<StockStore, [['zustand/devtools', never]]> = (...parameters) => ({
  ...initialState,
  ...createStockChatSlice(...parameters),
});

const devtools = createDevtools('agent');

export const useStockStore = createWithEqualityFn<StockStore>()(devtools(createStore), shallow);

export const getStockStoreState = () => useStockStore.getState();
