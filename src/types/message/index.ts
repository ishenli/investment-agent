import { ModelThoughtChain } from './base';
import { MessageToolCall } from './tools';

export * from './base';
export * from './chat';
export * from './image';
export * from './tools';

export interface SendMessageParams {
  /**
   * create a thread
   */
  files?: any[];
  /**
   *
   * https://github.com/lobehub/lobe-chat/pull/2086
   */
  isWelcomeQuestion?: boolean;
  message: string;
  onlyAddUserMessage?: boolean;
}

export interface SendThreadMessageParams {
  /**
   * create a thread
   */
  createNewThread?: boolean;
  // files?: UploadFileItem[];
  message: string;
  onlyAddUserMessage?: boolean;
}

export interface ModelRankItem {
  count: number;
  id: string | null;
}

export interface MessageTextChunk {
  text: string;
  type: 'text';
}

export interface CitationItem {
  favicon?: string;
  id?: string;
  title?: string;
  url: string;
}

export interface GroundingSearch {
  citations?: CitationItem[];
  searchQueries?: string[];
}

export interface MessageGroundingChunk {
  grounding: GroundingSearch;
  type: 'grounding';
}

export interface MessageToolCallsChunk {
  isAnimationActives?: boolean[];
  tool_calls: MessageToolCall[];
  type: 'tool_calls';
}

export interface MessageReasoningChunk {
  signature?: string;
  text?: string;
  type: 'reasoning';
}

export interface MessageRelatedChunk {
  related: string[];
  type: 'related';
}

export interface MessageThoughtChainChunk {
  thoughtChain: ModelThoughtChain;
  type: 'thoughtChain';
}
