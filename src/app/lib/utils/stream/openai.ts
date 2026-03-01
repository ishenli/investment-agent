import { nanoid } from '../uuid';
export const FIRST_CHUNK_ERROR_KEY = '_isFirstChunkError';

export interface StreamToolCallChunkData {
  function?: {
    arguments?: string;
    name?: string | null;
  };
  id?: string;
  index: number;
  type: 'function' | string;
}
export interface StreamProtocolChunk {
  data: any;
  id?: string;
  type: // pure text
    | 'text'
    // base64 format image
    | 'base64_image'
    // Tools use
    | 'tool_calls'
    // Model Thinking
    | 'reasoning'
    // use for reasoning signature, maybe only anthropic
    | 'reasoning_signature'
    // flagged reasoning signature
    | 'flagged_reasoning_signature'
    // Search or Grounding
    | 'grounding'
    // stop signal
    | 'stop'
    // Error
    | 'error'
    // token usage
    | 'usage'
    // performance monitor
    | 'speed'
    // unknown data result
    | 'data';
}

export interface StreamProtocolToolCallChunk {
  data: StreamToolCallChunkData[];
  id: string;
  type: 'tool_calls';
}

export const generateToolCallId = (index: number, functionName?: string) =>
  `${functionName || 'unknown_tool_call'}_${index}_${nanoid()}`;
