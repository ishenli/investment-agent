import { LOADING_FLAT, MESSAGE_CANCEL_FLAT } from '@renderer/const/message';
import { chatService, onFinishContext } from '@renderer/services/chat';
import { messageService } from '@renderer/services/message';
import { getAgentStoreState } from '@renderer/store/agent';
import { agentChatConfigSelectors, agentSelectors } from '@renderer/store/agent/selectors';
import { chatHelpers } from '@renderer/store/chat/helpers';
import { chatSelectors, topicSelectors } from '@renderer/store/chat/selectors';
import { ChatStore } from '@renderer/store/chat/store';
import { getSessionStoreState, useSessionStore } from '@renderer/store/session';
import { sessionSelectors } from '@renderer/store/session/selectors';
import {
  ChatMessage,
  ChatMessageError,
  CitationItem,
  CreateMessageParams,
  SendMessageParams,
} from '@typings/message';
import { isEqual } from 'lodash';
import { copyToClipboard } from '@lobehub/ui';
import { produce } from 'immer';
import { StateCreator } from 'zustand';
import { messageMapKey } from '../../message/selectors';

export type Action =
  | string
  | {
    [x: string | number | symbol]: unknown;
    type: string;
  };

interface ProcessMessageParams {
  traceId?: string;
  isWelcomeQuestion?: boolean;
  inSearchWorkflow?: boolean;
  /**
   * the RAG query content, should be embedding and used in the semantic search
   */
  ragQuery?: string;
  threadId?: string;
  inPortalThread?: boolean;
}

export interface AIGenerateAction {
  delAndRegenerateMessage: (id: string) => Promise<void>;
  regenerateMessage: (id: string) => Promise<void>;
  /**
   * Sends a new message to the AI chat system
   */
  sendMessage: (params: SendMessageParams) => Promise<void>;

  stopGenerateMessage: () => void;

  internal_coreProcessMessage: (
    messages: ChatMessage[],
    parentId: string,
    params?: ProcessMessageParams,
  ) => Promise<void>;

  internal_fetchAIChatMessage: (input: {
    messages: ChatMessage[];
    messageId: string;
    params?: ProcessMessageParams;
    model: string;
    provider: string;
  }) => Promise<{
    isFunctionCall: boolean;
    content: string;
    traceId?: string;
  }>;
  /**
   * Resends a specific message, optionally using a trace ID for tracking
   */
  internal_resendMessage: (
    id: string,
    params?: {
      traceId?: string;
      messages?: ChatMessage[];
      threadId?: string;
      inPortalThread?: boolean;
    },
  ) => Promise<void>;
  /**
   * Toggles the loading state for AI message generation, managing the UI feedback
   */
  internal_toggleChatLoading: (
    loading: boolean,
    id?: string,
    action?: Action,
  ) => AbortController | undefined;
  internal_toggleMessageInToolsCalling: (
    loading: boolean,
    id?: string,
    action?: Action,
  ) => AbortController | undefined;
  /**
   * Controls the streaming state of tool calling processes, updating the UI accordingly
   */
  internal_toggleToolCallingStreaming: (id: string, streaming: boolean[] | undefined) => void;
  /**
   * Toggles the loading state for AI message reasoning, managing the UI feedback
   */
  internal_toggleChatReasoning: (
    loading: boolean,
    id?: string,
    action?: string,
  ) => AbortController | undefined;

  internal_toggleSearchWorkflow: (loading: boolean, id?: string) => void;

  copyMessage: (id: string, content: string) => Promise<void>;
}

export const generateAIChat: StateCreator<
  ChatStore,
  [['zustand/devtools', never]],
  [],
  AIGenerateAction
> = (set, get) => ({
  delAndRegenerateMessage: async (id) => {
    const traceId = chatSelectors.getTraceIdByMessageId(id)(get());
    get().internal_resendMessage(id, { traceId });
    get().deleteMessage(id);
  },
  regenerateMessage: async (id) => {
    const traceId = chatSelectors.getTraceIdByMessageId(id)(get());
    await get().internal_resendMessage(id, { traceId });
  },
  internal_resendMessage: async (
    messageId,
    { traceId, messages: outChats, threadId: outThreadId, inPortalThread } = {},
  ) => {
    // 1. 构造所有相关的历史记录
    const chats = outChats ?? chatSelectors.mainAIChats(get());

    const currentIndex = chats.findIndex((c) => c.id === messageId);
    if (currentIndex < 0) return;

    const currentMessage = chats[currentIndex];

    let contextMessages: ChatMessage[] = [];

    switch (currentMessage.role) {
      // case 'tool':
      case 'user': {
        contextMessages = chats.slice(0, currentIndex + 1);
        break;
      }
      case 'assistant': {
        // 消息是 AI 发出的因此需要找到它的 user 消息
        const userId = currentMessage.parentId;
        const userIndex = chats.findIndex((c) => c.id === userId);
        // 如果消息没有 parentId，那么同 user/function 模式
        contextMessages = chats.slice(0, userIndex < 0 ? currentIndex + 1 : userIndex + 1);
        break;
      }
    }

    if (contextMessages.length <= 0) return;

    const { internal_coreProcessMessage } = get();

    const latestMsg = contextMessages.findLast((s) => s.role === 'user');

    if (!latestMsg) return;

    await internal_coreProcessMessage(contextMessages, latestMsg.id, {
      traceId,
      ragQuery: undefined,
      threadId: undefined,
      inPortalThread,
    });
  },
  sendMessage: async ({ message, onlyAddUserMessage, isWelcomeQuestion }) => {
    const { internal_coreProcessMessage, activeTopicId, activeId } = get();

    if (!activeId) return;

    if (!message) return;

    set({ isCreatingMessage: true }, false, 'creatingMessage/start');

    const newMessage: CreateMessageParams = {
      content: message,
      // if message has attached with files, then add files to message and the agent
      // files: fileIdList,
      role: 'user',
      sessionId: activeId,
      // if there is activeTopicId，then add topicId to message
      topicId: activeTopicId,
      threadId: 'activeThreadId',
    };

    const agentConfig = agentChatConfigSelectors.currentChatConfig(getAgentStoreState());

    let tempMessageId: string | undefined = undefined;
    let newTopicId: string | undefined = undefined;

    if (!onlyAddUserMessage && !activeTopicId) {
      // check activeTopic and then auto create topic
      const chats = chatSelectors.activeBaseChats(get());

      // we will add two messages (user and assistant), so the finial length should +2
      const featureLength = chats.length + 2;

      // if there is no activeTopicId and the feature length is greater than the threshold
      // then create a new topic and active it
      if (!activeTopicId && featureLength >= agentConfig.autoCreateTopicThreshold) {
        // we need to create a temp message for optimistic update
        tempMessageId = get().internal_createTmpMessage(newMessage);
        get().internal_toggleMessageLoading(true, tempMessageId);

        const topicId = await get().createTopic();

        if (topicId) {
          newTopicId = topicId;
          newMessage.topicId = topicId;

          // we need to copy the messages to the new topic or the message will disappear
          const mapKey = chatSelectors.currentChatKey(get());
          const newMaps = {
            ...get().messagesMap,
            [messageMapKey(activeId, topicId)]: get().messagesMap[mapKey],
          };
          set({ messagesMap: newMaps }, false, 'moveMessagesToNewTopic');

          // make the topic loading
          get().internal_updateTopicLoading(topicId, true);
        }
      }
    }
    //  update assistant update to make it rerank
    useSessionStore.getState().triggerSessionUpdate(get().activeId);

    const id = await get().internal_createMessage(newMessage, {
      tempMessageId,
      skipRefresh: !onlyAddUserMessage && newMessage.fileList?.length === 0,
    });

    if (!id) {
      set({ isCreatingMessage: false }, false, 'creatingMessage/start');
      if (!!newTopicId) get().internal_updateTopicLoading(newTopicId, false);
      return;
    }

    if (tempMessageId) get().internal_toggleMessageLoading(false, tempMessageId);

    // switch to the new topic if create the new topic
    if (!!newTopicId) {
      await get().switchTopic(newTopicId, true);
      await get().internal_fetchMessages();

      // delete previous messages
      // remove the temp message map
      const newMaps = {
        ...get().messagesMap,
        [messageMapKey(activeId, null)]: [],
      };
      set({ messagesMap: newMaps }, false, 'internal_copyMessages');
    }

    // if only add user message, then stop
    if (onlyAddUserMessage) {
      set({ isCreatingMessage: false }, false, 'creatingMessage/start');
      return;
    }

    // Get the current messages to generate AI response
    const messages = chatSelectors.activeBaseChats(get());

    await internal_coreProcessMessage(messages, id, {
      isWelcomeQuestion,
      ragQuery: undefined,
      threadId: 'activeThreadId',
    });

    set({ isCreatingMessage: false }, false, 'creatingMessage/stop');

    const summaryTitle = async () => {
      // if autoCreateTopic is false, then stop
      if (!agentConfig.enableAutoCreateTopic) return;

      // check activeTopic and then auto update topic title
      if (newTopicId) {
        const chats = chatSelectors.getBaseChatsByKey(messageMapKey(activeId, newTopicId))(get());
        await get().summaryTopicTitle(newTopicId, chats);
        return;
      }

      if (!activeTopicId) return;
      const topic = topicSelectors.getTopicById(activeTopicId)(get());

      if (topic && !topic.title) {
        const chats = chatSelectors.getBaseChatsByKey(messageMapKey(activeId, topic.id))(get());
        await get().summaryTopicTitle(topic.id, chats);
      }
    };

    await Promise.all([summaryTitle()]);
  },

  internal_coreProcessMessage: async (originalMessages, userMessageId, params) => {
    const { internal_fetchAIChatMessage, refreshMessages, activeTopicId } = get();
    // create a new array to avoid the original messages array change
    const messages = [...originalMessages];

    const agentStoreState = getAgentStoreState();
    const { model, provider, chatConfig } = agentSelectors.currentAgentConfig(agentStoreState);

    // 2. Add an empty message to place the AI response
    const assistantMessage: CreateMessageParams = {
      role: 'assistant',
      content: LOADING_FLAT,
      fromModel: model,
      fromProvider: provider,

      parentId: userMessageId,
      sessionId: get().activeId,
      topicId: activeTopicId, // if there is activeTopicId，then add it to topicId
      threadId: params?.threadId,
    };

    const assistantId = await get().internal_createMessage(assistantMessage);

    if (!assistantId) return;

    // 4. fetch the AI response
    const { isFunctionCall, content } = await internal_fetchAIChatMessage({
      messages,
      messageId: assistantId,
      params,
      model,
      provider: provider!,
    });

    if (isFunctionCall) {
      console.warn('isFunctionCall', isFunctionCall);
      await refreshMessages();
    }
    // 6. summary history if context messages is larger than historyCount
    const historyCount = agentChatConfigSelectors.historyCount(agentStoreState);

    if (
      agentChatConfigSelectors.enableHistoryCount(agentStoreState) &&
      chatConfig.enableCompressHistory &&
      originalMessages.length > historyCount
    ) {
      // after generation: [u1,a1,u2,a2,u3,a3]
      // but the `originalMessages` is still: [u1,a1,u2,a2,u3]
      // So if historyCount=2, we need to summary [u1,a1,u2,a2]
      // because user find UI is [u1,a1,u2,a2 | u3,a3]
      const historyMessages = originalMessages.slice(0, -historyCount + 1);

      await get().internal_summaryHistory(historyMessages);
    }
  },
  stopGenerateMessage: () => {
    const { chatLoadingIdsAbortController, internal_toggleChatLoading } = get();

    console.warn('stopGenerateMessage', chatLoadingIdsAbortController);

    if (!chatLoadingIdsAbortController) return;

    chatLoadingIdsAbortController.abort(MESSAGE_CANCEL_FLAT);

    internal_toggleChatLoading(false, undefined, 'stopGenerateMessage' as string);
  },

  internal_fetchMessages: async () => {
    const messages = await messageService.getMessages(get().activeId, get().activeTopicId);
    const nextMap = {
      ...get().messagesMap,
      [chatSelectors.currentChatKey(get())]: messages,
    };
    // no need to update map if the messages have been init and the map is the same
    if (get().messagesInit && isEqual(nextMap, get().messagesMap)) return;

    set({ messagesInit: true, messagesMap: nextMap }, false, 'internal_fetchMessages');
  },

  internal_fetchAIChatMessage: async ({ messages, messageId, params, provider, model }) => {
    const {
      internal_toggleChatLoading,
      refreshMessages,
      internal_updateMessageContent,
      internal_dispatchMessage,
      internal_toggleToolCallingStreaming,
      internal_toggleChatReasoning,
      activeId,
      activeTopicId,
    } = get();

    const abortController = internal_toggleChatLoading(true, messageId, 'generateMessage(start)');
    // const sessionSource = sessionSelectors.currentSession(getSessionStoreState())
    // console.info('sessionSource', sessionSource);
    // const agentConfigSource = agentSelectors.currentAgentConfig(getAgentStoreState());
    // console.info('agentConfigSource', agentConfigSource);
    // const agentConfig = {
    //   systemRole: '',
    //   params: {
    //     max_tokens: 1000,
    //   },
    //   plugins: [],
    // };
    const agentConfig = agentSelectors.currentAgentConfig(getAgentStoreState());
    const chatConfig = agentChatConfigSelectors.currentChatConfig(getAgentStoreState());

    // ================================== //
    //   messages uniformly preprocess    //
    // ================================== //

    // 1. slice messages with config
    const historyCount = agentChatConfigSelectors.historyCount(getAgentStoreState());
    const enableHistoryCount = agentChatConfigSelectors.enableHistoryCount(getAgentStoreState());

    let preprocessMsgs = chatHelpers.getSlicedMessages(messages, {
      includeNewUserMessage: true,
      enableHistoryCount,
      historyCount,
    });

    // 2. replace inputMessage template
    // 3. add systemRole
    if (agentConfig.systemRole) {
      preprocessMsgs.unshift({
        content: agentConfig.systemRole,
        role: 'system',
      } as ChatMessage);
    }

    // 4. handle max_tokens
    agentConfig.params.max_tokens = chatConfig.enableMaxTokens
      ? agentConfig.params.max_tokens
      : undefined;
    // 5. handle reasoning_effort
    let isFunctionCall = false;
    let msgTraceId: string | undefined;
    let output = '';
    let thinking = '';
    let thinkingStartAt: number;
    let duration: number;
    // to upload image

    const historySummary = chatConfig.enableCompressHistory
      ? topicSelectors.currentActiveTopicSummary(get())
      : undefined;
    const currentSession = sessionSelectors.currentSession(useSessionStore.getState());

    // console.info('currentSession', currentSession);

    await chatService.createAssistantMessageStream({
      params: {
        sessionId: activeId + '_' + activeTopicId,
        messages: preprocessMsgs,
        model,
        provider,
        agentId: currentSession?.agentId || '',
        plugins: agentConfig.plugins,
        ...agentConfig.params,
      },
      historySummary: historySummary?.content,
      isWelcomeQuestion: params?.isWelcomeQuestion,
      abortController,
      onErrorHandle: async (error: ChatMessageError) => {
        await messageService.updateMessageError(messageId, error);
        await refreshMessages();
      },
      onFinish: async (
        content: string,
        {
          toolCalls,
          reasoning,
          grounding,
          usage,
          speed,
          related,
          traceId,
          chatId,
          sessionId,
        }: onFinishContext,
      ) => {
        // 隐藏 Loading 的状态
        internal_toggleChatLoading(false, messageId, 'generateMessage(end)');

        let parsedToolCalls = toolCalls;
        if (parsedToolCalls && parsedToolCalls.length > 0) {
          internal_toggleToolCallingStreaming(messageId, undefined);
          // @ts-ignore
          parsedToolCalls = parsedToolCalls.map((item: { function: { arguments: any } }) => ({
            ...item,
            function: {
              ...item.function,
              arguments: !!item.function.arguments ? item.function.arguments : '{}',
            },
          }));
          isFunctionCall = true;
        }

        // update the content after fetch result
        await internal_updateMessageContent(messageId, content, {
          reasoning: !!reasoning ? { ...reasoning, duration } : undefined,
          metadata: speed ? { ...usage, ...speed } : usage,
          search: !!grounding?.citations ? grounding : undefined,
          related: related,
          traceId: traceId,
        });
      },
      onMessageHandle: async (chunk) => {
        switch (chunk.type) {
          case 'grounding': {
            // if there is no citations, then stop
            if (
              !chunk.grounding ||
              !chunk.grounding.citations ||
              chunk.grounding.citations.length <= 0
            )
              return;

            internal_dispatchMessage({
              id: messageId,
              type: 'updateMessage',
              value: {
                search: {
                  citations: chunk.grounding.citations as CitationItem[],
                  searchQueries: chunk.grounding.searchQueries,
                },
              },
            });
            break;
          }
          case 'text': {
            output += chunk.text;

            // if there is no duration, it means the end of reasoning
            if (!duration) {
              duration = Date.now() - thinkingStartAt;

              const isInChatReasoning = chatSelectors.isMessageInChatReasoning(messageId)(get());
              if (isInChatReasoning) {
                internal_toggleChatReasoning(false, messageId, 'toggleChatReasoning/false');
              }
            }
            internal_dispatchMessage({
              id: messageId,
              type: 'updateMessage',
              value: {
                content: output,
                reasoning: !!thinking ? { content: thinking, duration } : undefined,
              },
            });
            break;
          }
          case 'related': {
            internal_dispatchMessage({
              id: messageId,
              type: 'updateMessage',
              value: { related: chunk.related },
            });
            break;
          }

          case 'reasoning': {
            // if there is no thinkingStartAt, it means the start of reasoning
            if (!thinkingStartAt) {
              thinkingStartAt = Date.now();
              internal_toggleChatReasoning(true, messageId, 'toggleChatReasoning/true');
            }

            thinking += chunk.text;

            internal_dispatchMessage({
              id: messageId,
              type: 'updateMessage',
              value: { reasoning: { content: thinking } },
            });
            break;
          }

          case 'thoughtChain': {
            internal_dispatchMessage({
              id: messageId,
              type: 'updateMessage',
              value: { thoughtChain: chunk.thoughtChain },
            });
            break;
          }
          // case 'tool_calls': {
          //   internal_toggleToolCallingStreaming(messageId, chunk.isAnimationActives);
          //   internal_dispatchMessage({
          //     id: messageId,
          //     type: 'updateMessage',
          //     value: { tools: get().internal_transformToolCalls(chunk.tool_calls) },
          //   });
          //   isFunctionCall = true;
          // }
        }
      },
    });

    return { isFunctionCall, traceId: msgTraceId, content: output };
  },

  // ----- Loading ------- //
  internal_toggleChatLoading: (loading, id, action) => {
    return get().internal_toggleLoadingArrays('chatLoadingIds', loading, id, action);
  },
  internal_toggleMessageInToolsCalling: (loading, id) => {
    return get().internal_toggleLoadingArrays('messageInToolsCallingIds', loading, id);
  },
  internal_toggleChatReasoning: (loading, id, action) => {
    return get().internal_toggleLoadingArrays('reasoningLoadingIds', loading, id, action);
  },
  internal_toggleToolCallingStreaming: (id, streaming) => {
    set(
      {
        toolCallingStreamIds: produce(get().toolCallingStreamIds, (draft) => {
          if (!!streaming) {
            draft[id] = streaming;
          } else {
            delete draft[id];
          }
        }),
      },

      false,
      `toggleToolCallingStreaming/${!!streaming ? 'start' : 'end'}`,
    );
  },
  internal_toggleSearchWorkflow: (loading, id) => {
    return get().internal_toggleLoadingArrays('searchWorkflowLoadingIds', loading, id);
  },

  copyMessage: async (id, content) => {
    await copyToClipboard(content);
  },
});
