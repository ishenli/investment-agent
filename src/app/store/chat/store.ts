import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { createWithEqualityFn } from 'zustand/traditional';
import { ChatStoreState, initialState } from './initialState';

import { StateCreator } from 'zustand';
import { shallow } from 'zustand/shallow';
import { AIGenerateAction, generateAIChat } from './slices/aiChat/actions/generateAIChat';
import { chatMemory, ChatMemoryAction } from './slices/aiChat/actions/memory';
import { chatMessage, ChatMessageAction } from './slices/message/action';
import { chatTopic, ChatTopicAction } from './slices/topic/action';
import { ChatPortalAction, chatPortalSlice } from './slices/portal/action';
import { ChatBuiltinToolAction, chatToolSlice } from './slices/builtinTool/actions';
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ChatStoreAction
  extends ChatMessageAction,
  ChatTopicAction,
  AIGenerateAction,
  ChatPortalAction,
  ChatBuiltinToolAction,
  ChatMemoryAction {
  // xx
}

export type ChatStore = ChatStoreAction & ChatStoreState;

const createStore: StateCreator<ChatStore, [['zustand/devtools', never]]> = (...params) => ({
  ...initialState,
  ...chatMessage(...params),
  ...chatTopic(...params),
  ...generateAIChat(...params),
  ...chatMemory(...params),
  ...chatPortalSlice(...params),
  ...chatToolSlice(...params),
});

export const useChatStore = createWithEqualityFn<ChatStore>()(
  subscribeWithSelector(devtools(createStore)),
  shallow,
);

export const getChatStoreState = () => useChatStore.getState();
