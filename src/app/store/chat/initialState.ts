// sort-imports-ignore
import { ChatAIChatState, initialAiChatState } from './slices/aiChat/initialState';
import { ChatMessageState, initialMessageState } from './slices/message/initialState';
import { ChatTopicState, initialTopicState } from './slices/topic/initialState';
import { ChatPortalState, initialChatPortalState } from './slices/portal/initialState';
import { ChatToolState, initialToolState } from './slices/builtinTool/initialState';

export type ChatStoreState = ChatMessageState & ChatAIChatState & ChatTopicState & ChatPortalState & ChatToolState;

export const initialState: ChatStoreState = {
  ...initialMessageState,
  ...initialAiChatState,
  ...initialTopicState,
  ...initialChatPortalState,
  ...initialToolState,
  
};
