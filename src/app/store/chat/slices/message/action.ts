import { messageService } from '@renderer/services/message';
import { topicService } from '@renderer/services/topic';
import { ChatErrorType } from '@typings/fetch';
import {
  ChatImageItem,
  ChatMessage,
  ChatMessageError,
  ChatMessagePluginError,
  CreateMessageParams,
  GroundingSearch,
  MessageMetadata,
  MessageToolCall,
  ModelReasoning,
} from '@typings/message';
import { useClientDataSWR } from '@renderer/lib/utils/swr';
import { nanoid } from '@renderer/lib/utils/uuid';
import isEqual from 'fast-deep-equal';
import { produce } from 'immer';
import { SWRResponse, mutate } from 'swr';
import { StateCreator } from 'zustand';
import { ChatStoreState } from '../../initialState';
import { chatSelectors } from '../../selectors';
import { ChatStore } from '../../store';
import { Action } from '../aiChat/actions/generateAIChat';
import { MessageDispatch, messagesReducer } from './reducer';
import { messageMapKey } from './selectors';

const SWR_USE_FETCH_MESSAGES = 'SWR_USE_FETCH_MESSAGES';

export interface ChatMessageAction {
  // query
  useFetchMessages: (
    enable: boolean,
    sessionId: string,
    topicId?: string,
  ) => SWRResponse<ChatMessage[]>;
  // create
  addAIMessage: () => Promise<void>;
  clearMessage: () => Promise<void>;
  updateInputMessage: (message: string) => void;
  refreshMessages: () => Promise<void>;
  modifyMessageContent: (id: string, content: string) => Promise<void>;
  toggleMessageEditing: (id: string, editing: boolean) => void;
  deleteMessage: (id: string) => Promise<void>;
  likeMessage: (
    id: string,
    content: string,
  ) => Promise<{
    likeAction: string;
  }>;
  internal_createMessage: (
    params: CreateMessageParams,
    context?: { tempMessageId?: string; skipRefresh?: boolean },
  ) => Promise<string | undefined>;
  internal_toggleMessageLoading: (loading: boolean, id: string) => void;
  internal_createTmpMessage: (params: CreateMessageParams) => string;
  internal_dispatchMessage: (payload: MessageDispatch) => void;
  internal_fetchMessages: () => Promise<void>;
  internal_toggleLoadingArrays: (
    key: keyof ChatStoreState,
    loading: boolean,
    id?: string,
    action?: Action,
  ) => AbortController | undefined;
  // internal_dispatchMessage: (payload: MessageDispatch) => void;
  internal_updateMessageContent: (
    id: string,
    content: string,
    extra?: {
      toolCalls?: MessageToolCall[];
      reasoning?: ModelReasoning;
      search?: GroundingSearch;
      metadata?: MessageMetadata;
      imageList?: ChatImageItem[];
      model?: string;
      provider?: string;
      related?: string[];
      chatId?: string;
      sessionId?: string;
      traceId?: string;
    },
  ) => Promise<void>;

  internal_updateMessageError: (id: string, error: ChatMessageError | null) => Promise<void>;
  internal_updateMessagePluginError: (
    id: string,
    error: ChatMessagePluginError | null,
  ) => Promise<void>;
}

export const preventLeavingFn = (e: BeforeUnloadEvent) => {
  // set returnValue to trigger alert modal
  // Note: No matter what value is set, the browser will display the standard text
  e.returnValue = '你有正在生成中的请求，确定要离开吗？';
};

export const toggleBooleanList = (ids: string[], id: string, loading: boolean) => {
  return produce(ids, (draft) => {
    if (loading) {
      if (!draft.includes(id)) draft.push(id);
    } else {
      const index = draft.indexOf(id);

      if (index >= 0) draft.splice(index, 1);
    }
  });
};

export const chatMessage: StateCreator<
  ChatStore,
  [['zustand/devtools', never]],
  [],
  ChatMessageAction
> = (set, get) => ({
  addAIMessage: async () => {
    console.log('addAIMessage');
  },
  clearMessage: async () => {
    const { activeId, activeTopicId, refreshMessages, refreshTopic, switchTopic } = get();

    await messageService.removeMessagesByAssistant(activeId, activeTopicId);

    if (activeTopicId) {
      await topicService.removeTopic(activeTopicId);
    }
    await refreshTopic();
    await refreshMessages();

    // after remove topic , go back to default topic
    switchTopic();
  },
  updateInputMessage: (message) => {
    if (isEqual(message, get().inputMessage)) return;

    set({ inputMessage: message }, false, 'updateInputMessage');
  },

  internal_createMessage: async (message, context) => {
    const {
      internal_createTmpMessage,
      refreshMessages,
      internal_toggleMessageLoading,
      internal_dispatchMessage,
    } = get();
    let tempId = context?.tempMessageId;
    if (!tempId) {
      // use optimistic update to avoid the slow waiting
      tempId = internal_createTmpMessage(message);

      internal_toggleMessageLoading(true, tempId);
    }

    try {
      const id = await messageService.createMessage(message);
      if (!context?.skipRefresh) {
        internal_toggleMessageLoading(true, tempId);
        await refreshMessages();
      }

      internal_toggleMessageLoading(false, tempId);
      return id;
    } catch (e) {
      internal_toggleMessageLoading(false, tempId);
      internal_dispatchMessage({
        id: tempId,
        type: 'updateMessage',
        value: {
          error: {
            type: ChatErrorType.CreateMessageError,
            message: (e as Error).message,
            body: e,
          },
        },
      });
    }
  },
  internal_toggleMessageLoading: (loading, id) => {
    set(
      {
        messageLoadingIds: toggleBooleanList(get().messageLoadingIds, id, loading),
      },
      false,
      `internal_toggleMessageLoading/${loading ? 'start' : 'end'}`,
    );
  },
  refreshMessages: async () => {
    await mutate([SWR_USE_FETCH_MESSAGES, get().activeId, get().activeTopicId]);
  },

  internal_createTmpMessage: (message) => {
    const { internal_dispatchMessage } = get();

    // use optimistic update to avoid the slow waiting
    const tempId = 'tmp_' + nanoid();
    internal_dispatchMessage({
      type: 'createMessage',
      id: tempId,
      value: message,
    });

    return tempId;
  },
  internal_dispatchMessage: (payload) => {
    const { activeId } = get();

    if (!activeId) return;

    const messages = messagesReducer(chatSelectors.activeBaseChats(get()), payload);

    const nextMap = {
      ...get().messagesMap,
      [chatSelectors.currentChatKey(get())]: messages,
    };

    if (isEqual(nextMap, get().messagesMap)) return;

    set({ messagesMap: nextMap }, false, {
      type: `dispatchMessage/${payload.type}`,
      payload,
    });
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
  internal_toggleLoadingArrays: (key, loading, id, action) => {
    const abortControllerKey = `${key}AbortController`;
    if (loading) {
      window.addEventListener('beforeunload', preventLeavingFn);

      const abortController = new AbortController();
      set(
        {
          [abortControllerKey]: abortController,
          [key]: toggleBooleanList(get()[key] as string[], id!, loading),
        },
        false,
        action,
      );

      return abortController;
    } else {
      if (!id) {
        set({ [abortControllerKey]: undefined, [key]: [] }, false, action);
      } else
        set(
          {
            [abortControllerKey]: undefined,
            [key]: toggleBooleanList(get()[key] as string[], id, loading),
          },
          false,
          action,
        );

      window.removeEventListener('beforeunload', preventLeavingFn);
    }
  },
  internal_updateMessageContent: async (id, content, extra) => {
    const { internal_dispatchMessage, refreshMessages } = get();

    internal_dispatchMessage({
      id,
      type: 'updateMessage',
      value: { content, related: extra?.related, traceId: extra?.traceId },
    });

    // 保存到 DB
    await messageService.updateMessage(id, {
      content,
      // tools: extra?.toolCalls ? internal_transformToolCalls(extra?.toolCalls) : undefined,
      reasoning: extra?.reasoning,
      search: extra?.search,
      metadata: extra?.metadata,
      model: extra?.model,
      provider: extra?.provider,
      imageList: extra?.imageList,
      related: extra?.related,
      traceId: extra?.traceId,
    });

    // 重新刷一下页面
    await refreshMessages();
  },
  modifyMessageContent: async (id, content) => {
    await get().internal_updateMessageContent(id, content);
  },
  toggleMessageEditing: (id, editing) => {
    set(
      {
        messageEditingIds: toggleBooleanList(get().messageEditingIds, id, editing),
      },
      false,
      'toggleMessageEditing',
    );
  },
  deleteMessage: async (id) => {
    const message = chatSelectors.getMessageById(id)(get());
    if (!message) return;

    let ids = [message.id];

    // if the message is a tool calls, then delete all the related messages
    if (message.tools) {
      const toolMessageIds = message.tools.flatMap((tool) => {
        const messages = chatSelectors
          .activeBaseChats(get())
          .filter((m) => m.tool_call_id === tool.id);

        return messages.map((m) => m.id);
      });
      ids = ids.concat(toolMessageIds);
    }

    get().internal_dispatchMessage({ type: 'deleteMessages', ids });
    await messageService.removeMessages(ids);
    await get().refreshMessages();
  },

  likeMessage: async (id, content) => {
    console.warn('like', id, content);
    const likeStatus = await messageService.getMessageLikeStatus(id);
    let likeAction = 'like';
    if (likeStatus === 'like') {
      await messageService.updateMessageLikeStatus(id, 'unknown', content);
      likeAction = 'unknown';
    } else {
      await messageService.updateMessageLikeStatus(id, 'like', content);
      likeAction = 'like';
    }
    (window as any).yuyanMonitor?.log({
      code: 11,
      msg: '点赞消息',
      d1: `消息id; ${id}`,
      d2: `消息内容: ${content}`,
    });

    return {
      likeAction,
    };
  },

  internal_updateMessageError: async (id, error) => {
    get().internal_dispatchMessage({ id, type: 'updateMessage', value: { error } });
    await messageService.updateMessage(id, { error });
    await get().refreshMessages();
  },

  internal_updateMessagePluginError: async (id, error) => {
    await messageService.updateMessagePluginError(id, error as ChatMessagePluginError);
    await get().refreshMessages();
  },

  // 消息获取入口
  useFetchMessages: (enable, sessionId, activeTopicId) =>
    useClientDataSWR<ChatMessage[]>(
      enable ? [SWR_USE_FETCH_MESSAGES, sessionId, activeTopicId] : null,
      async ([, sessionId, topicId]: [string, string, string | undefined]) =>
        messageService.getMessages(sessionId, topicId),
      {
        onSuccess: (messages, key) => {
          // console.warn('useFetchMessages', messages, sessionId, activeTopicId);
          const nextMap = {
            ...get().messagesMap,
            [messageMapKey(sessionId, activeTopicId)]: messages,
          };
          // no need to update map if the messages have been init and the map is the same
          if (get().messagesInit && isEqual(nextMap, get().messagesMap)) return;

          set({ messagesInit: true, messagesMap: nextMap }, false, 'useFetchMessages' + key);
        },
      },
    ),
});
