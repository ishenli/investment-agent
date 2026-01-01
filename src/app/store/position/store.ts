import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { StateCreator } from 'zustand/vanilla';
import { initialPositionState, PositionState } from './initialState';
import { createDevtools } from '../middleware/createDevtools';
import { createPositionSlice, PositionActions } from './action';

export type PositionStore = PositionState & PositionActions;

//  ===============  aggregate createStoreFn ============ //

const createStore: StateCreator<PositionStore, [['zustand/devtools', never]]> = (
  ...parameters
) => ({
  ...initialPositionState,
  ...createPositionSlice(...parameters),
});

const devtools = createDevtools('position');

export const usePositionStore = createWithEqualityFn<PositionStore>()(
  devtools(createStore),
  shallow,
);

export const getPositionStoreState = () => usePositionStore.getState();
