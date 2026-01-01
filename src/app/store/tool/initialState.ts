import { BuiltinToolState, initialBuiltinToolState } from './slices/builtin';
import { PluginState, initialPluginState } from './slices/plugin';
import { PluginStoreState, initialPluginStoreState } from './slices/oldStore';

export type ToolStoreState = PluginState &
  PluginStoreState &
  BuiltinToolState;

export const initialState: ToolStoreState = {
  ...initialPluginState,
  ...initialBuiltinToolState,
  ...initialPluginStoreState, 
};
