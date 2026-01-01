import { StateCreator } from 'zustand/vanilla';

import { DEFAULT_MODEL, DEFAULT_PROVIDER } from '@renderer/const/settings';
import { chatService } from '@renderer/services/chat';
import { topicService } from '@renderer/services/topic';
import { ChatStore } from '@renderer/store/chat';
import { ChatMessage } from '@typings/message';

export interface ChatMemoryAction {
  internal_summaryHistory: (messages: ChatMessage[]) => Promise<void>;
}

export const chatMemory: StateCreator<
  ChatStore,
  [['zustand/devtools', never]],
  [],
  ChatMemoryAction
> = (set, get) => ({
  internal_summaryHistory: async (messages) => {
    const topicId = get().activeTopicId;
    if (messages.length <= 1 || !topicId) return;

    const provider = DEFAULT_PROVIDER;
    const model = DEFAULT_MODEL;

    let historySummary = '';
    await chatService.fetchPresetTaskResult({
      onFinish: async (text) => {
        historySummary = text;
      },
      params: { messages, model, provider, stream: false },
      // trace: {
      //   sessionId: get().activeId,
      //   topicId: get().activeTopicId,
      // },
    });

    await topicService.updateTopic(topicId, {
      historySummary,
      metadata: { model, provider },
    });
    await get().refreshTopic();
    await get().refreshMessages();
  },
});
