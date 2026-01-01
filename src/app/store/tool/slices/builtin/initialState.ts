import { builtinTools } from '@renderer/tools';
import { LobeBuiltinTool } from '@/types/tool';

export interface BuiltinToolState {
  builtinToolLoading: Record<string, boolean>;
  builtinTools: LobeBuiltinTool[];
}

export const initialBuiltinToolState: BuiltinToolState = {
  builtinToolLoading: {},
  builtinTools,
};
