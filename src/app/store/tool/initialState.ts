import { BuiltinToolState, initialBuiltinToolState } from './slices/builtin';

export type ToolStoreState = BuiltinToolState;

export const initialState: ToolStoreState = {
  ...initialBuiltinToolState,
};
