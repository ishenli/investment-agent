import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { StateCreator } from 'zustand/vanilla';

import { createDevtools } from '../middleware/createDevtools';
import { ToolStoreState, initialState } from './initialState';
import { BuiltinToolAction, createBuiltinToolSlice } from './slices/builtin';
import { PluginAction, createPluginSlice } from './slices/plugin';
import { PluginStoreAction, createPluginStoreSlice } from './slices/oldStore';

//  ===============  聚合 createStoreFn ============ //

export type ToolStore = ToolStoreState &
  PluginAction &
  PluginStoreAction &
  BuiltinToolAction;

  
const createStore: StateCreator<ToolStore, [['zustand/devtools', never]]> = (...parameters) => ({
  ...initialState,
  ...createPluginSlice(...parameters),
  ...createPluginStoreSlice(...parameters),
  ...createBuiltinToolSlice(...parameters),
});

//  ===============  实装 useStore ============ //

const devtools = createDevtools('tools');

export const useToolStore = createWithEqualityFn<ToolStore>()(devtools(createStore), shallow);

export const getToolStoreState = () => useToolStore.getState();
