import { MESSAGE_CANCEL_FLAT } from '@renderer/const/message';
import { INBOX_SESSION_ID } from '@renderer/const/session';
import { sessionService } from '@renderer/services/session';
import { SessionStore } from '@renderer/store/session';
import { useClientDataSWR } from '@renderer/lib/utils/swr';
import { merge } from '@renderer/lib/utils/merge';
import { LobeAgentChatConfig, LobeAgentConfig } from '@typings/agent';
import { MetaData } from '@typings/meta';
import {
  ChatSessionList,
  LobeAgentSession,
  LobeSessions,
  LobeSessionType,
  UpdateSessionParams,
} from '@typings/session';
import { isEqual } from 'lodash';
import { produce } from 'immer';
import { mutate, SWRResponse } from 'swr';
import useSWR from 'swr';
import type { PartialDeep } from 'type-fest';
import { StateCreator } from 'zustand/vanilla';

import { LobeSessionGroups } from '@typings/session/sessionGroup';
import { SessionDispatch } from './reducers';
import { sessionSelectors } from './selectors';

const FETCH_SESSIONS_KEY = 'fetchSessions';
const SEARCH_SESSIONS_KEY = 'searchSessions';
const FETCH_AGENT_CONFIG_KEY = 'FETCH_AGENT_CONFIG';

export interface SessionAction {
  /**
   * switch the session
   */
  switchSession: (sessionId: string) => void;
  /**
   * reset sessions to default
   */
  clearSessions: () => Promise<void>;

  useFetchSessions: (
    enabled: boolean,
    isLogin: boolean | undefined,
  ) => SWRResponse<ChatSessionList>;
  /**
   * create a new session
   * @param agent
   * @returns sessionId
   */
  createSession: (
    session?: PartialDeep<LobeAgentSession>,
    isSwitchSession?: boolean,
  ) => Promise<string>;
  duplicateSession: (id: string) => Promise<void>;
  triggerSessionUpdate: (id: string) => Promise<void>;
  updateSessionGroupId: (sessionId: string, groupId: string) => Promise<void>;
  updateSessionMeta: (meta: Partial<MetaData>) => void;

  /**
   * Pins or unpins a session.
   */
  pinSession: (id: string, pinned: boolean) => Promise<void>;
  /**
   * re-fetch the data
   */
  refreshSessions: () => Promise<void>;
  /**
   * remove session
   * @param id - sessionId
   */
  removeSession: (id: string) => Promise<void>;
  useSearchSessions: (keyword?: string) => any;
  updateSearchKeywords: (keywords: string) => void;

  internal_dispatchSessions: (payload: SessionDispatch) => void;
  internal_updateSession: (id: string, data: Partial<UpdateSessionParams>) => Promise<void>;
  internal_processSessions: (
    sessions: LobeSessions,
    customGroups: LobeSessionGroups,
    actions?: string,
  ) => void;

  // ─────────────────────────────────────────────────────────────
  // Migrated from AgentStore
  // ─────────────────────────────────────────────────────────────

  /** 更新当前会话的 agent config（model/systemRole/engineType/chatConfig 等） */
  updateAgentConfig: (config: PartialDeep<LobeAgentConfig>) => Promise<void>;
  /** 更新当前会话的 chatConfig */
  updateAgentChatConfig: (config: Partial<LobeAgentChatConfig>) => Promise<void>;
  /** 切换 plugin 开关 */
  togglePlugin: (id: string, open?: boolean) => Promise<void>;
  /** 移除 plugin */
  removePlugin: (id: string) => Promise<void>;
  /** SWR hook：加载并填充 agentMap */
  useFetchAgentConfig: (isLogin: boolean | undefined, id: string) => SWRResponse<LobeAgentConfig>;

  internal_dispatchAgentMap: (
    id: string,
    config: PartialDeep<LobeAgentConfig>,
    actions?: string,
  ) => void;
  internal_refreshAgentConfig: (id: string) => Promise<void>;
  internal_updateAgentConfig: (
    id: string,
    data: PartialDeep<LobeAgentConfig>,
    signal?: AbortSignal,
  ) => Promise<void>;
  internal_createAbortController: (key: 'updateAgentConfigSignal' | 'updateAgentChatConfigSignal') => AbortController;
}

export const createSessionSlice: StateCreator<
  SessionStore,
  [['zustand/devtools', never]],
  [],
  SessionAction
> = (set, get) => ({
  clearSessions: async () => {
    await sessionService.removeAllSessions();
    await get().refreshSessions();
  },

  createSession: async (session, isSwitchSession = true) => {
    const { switchSession, refreshSessions } = get();

    // 使用 sessionService 创建新会话，传递基本参数
    const sessionData = session
      ? {
          meta: session.meta,
          model: session.model,
          group: session.group,
          pinned: session.pinned,
          tags: session.tags,
          config: session.config,
        }
      : {};

    const id = await sessionService.createSession(LobeSessionType.Agent, sessionData as any);
    await refreshSessions();

    // 是否切换到新会话
    if (isSwitchSession) {
      switchSession(id);
    }

    return id;
  },

  duplicateSession: async (id) => {
    const { switchSession, refreshSessions } = get();

    // 获取原会话信息
    const sessions = get().sessions;
    const originalSession = sessions.find((s) => s.id === id);

    if (!originalSession) return;

    const newTitle = `${originalSession.meta?.title || '未命名会话'} (副本)`;
    const newId = await sessionService.cloneSession(id, newTitle);

    if (newId) {
      await refreshSessions();
      switchSession(newId);
    }
  },

  triggerSessionUpdate: async (id) => {
    await get().internal_updateSession(id, { updatedAt: new Date() });
  },

  updateSessionGroupId: async (sessionId, groupId) => {
    await get().internal_updateSession(sessionId, { group: groupId });
  },

  updateSessionMeta: async (meta) => {
    const activeId = get().activeId;
    if (activeId && activeId !== INBOX_SESSION_ID) {
      await get().internal_updateSession(activeId, { meta });
    }
  },

  pinSession: async (id, pinned) => {
    await get().internal_updateSession(id, { pinned });
  },

  refreshSessions: async () => {
    // 使用 SWR mutate 触发重新验证，全局共享同一个请求
    // 而非直接调用 sessionService.getGroupedSessions()，
    // 避免绕过 SWR 缓存层并行发起重复请求
    await mutate([FETCH_SESSIONS_KEY, true]);
  },

  removeSession: async (sessionId) => {
    await sessionService.removeSession(sessionId);
    await get().refreshSessions();

    // 如果删除的是当前活跃会话，切换到收件箱
    if (sessionId === get().activeId) {
      get().switchSession(INBOX_SESSION_ID);
    }
  },

  switchSession: (sessionId) => {
    if (get().activeId === sessionId) return;
    set({ activeId: sessionId });
  },

  updateSearchKeywords: (keywords) => {
    set({
      isSearching: !!keywords,
      sessionSearchKeywords: keywords,
    });
  },
  useSearchSessions: (keyword) =>
    useSWR<LobeSessions>(
      [SEARCH_SESSIONS_KEY, keyword],
      async () => {
        if (!keyword) return [];

        return sessionService.searchSessions(keyword);
      },
      { revalidateOnFocus: false, revalidateOnMount: false },
    ),

  internal_dispatchSessions: (payload) => {
    // 这里可以添加会话状态分发的逻辑
    console.log('Session dispatch:', payload);
  },

  internal_updateSession: async (id, data) => {
    await sessionService.updateSession(id, data);
    await get().refreshSessions();
  },

  internal_processSessions: (allSessions, sessionGroups) => {
    const sessions = allSessions.filter((item) => item.slug !== INBOX_SESSION_ID);

    const customGroups = sessionGroups.map((item) => ({
      ...item,
      children: sessions.filter((i) => i.group === item.id && !i.pinned),
    }));

    const defaultGroup = sessions.filter(
      (item) => (!item.group || item.group === 'default') && !item.pinned,
    );
    const pinnedGroup = sessions.filter((item) => item.pinned);

    set(
      {
        customSessionGroups: customGroups,
        defaultSessions: defaultGroup,
        pinnedSessions: pinnedGroup,
        sessionGroups,
        sessions: allSessions,
      },
      false,
      'processSessions',
    );
  },
  useFetchSessions: (enabled, isLogin) =>
    useClientDataSWR<ChatSessionList>(
      enabled ? [FETCH_SESSIONS_KEY, isLogin] : null,
      () => sessionService.getGroupedSessions(),
      {
        fallbackData: {
          sessionGroups: [],
          sessions: [],
        },
        onSuccess: (data) => {
          if (
            get().isSessionsFirstFetchFinished &&
            isEqual(get().sessions, data.sessions) &&
            isEqual(get().sessionGroups, data.sessionGroups)
          )
            return;

          get().internal_processSessions(
            data.sessions,
            data.sessionGroups,
            'useFetchSessions/updateData' as any,
          );
          set({ isSessionsFirstFetchFinished: true }, false, 'useFetchSessions/onSuccess');
        },
        suspense: true,
      },
    ),

  // ─────────────────────────────────────────────────────────────
  // Migrated from AgentStore
  // ─────────────────────────────────────────────────────────────

  updateAgentConfig: async (config) => {
    const { activeId } = get();
    if (!activeId) return;
    const controller = get().internal_createAbortController('updateAgentConfigSignal');
    await get().internal_updateAgentConfig(activeId, config, controller.signal);
  },

  updateAgentChatConfig: async (config) => {
    await get().updateAgentConfig({ chatConfig: config });
  },

  togglePlugin: async (id, open) => {
    const originConfig = sessionSelectors.currentSessionConfig(get());

    const plugins = produce(originConfig.plugins || [], (draft: string[]) => {
      const index = draft.indexOf(id);
      const shouldOpen = open !== undefined ? open : index === -1;
      if (shouldOpen) {
        if (index === -1) draft.push(id);
      } else {
        if (index !== -1) draft.splice(index, 1);
      }
    });

    const { activeId } = get();
    if (!activeId) return;

    await sessionService.updateSessionConfig(activeId, { plugins });
    await get().refreshSessions();
  },

  removePlugin: async (id) => {
    await get().togglePlugin(id, false);
  },

  useFetchAgentConfig: (isLogin, sessionId) =>
    useClientDataSWR<LobeAgentConfig>(
      isLogin ? [FETCH_AGENT_CONFIG_KEY, sessionId] : null,
      ([, id]: string[]) => sessionService.getSessionConfig(id),
      {
        onSuccess: (data) => {
          get().internal_dispatchAgentMap(sessionId, data, 'fetch');
          set(
            {
              activeAgentId: data.id,
              agentConfigInitMap: {
                ...get().agentConfigInitMap,
                [sessionId]: true,
              },
            },
            false,
            'fetchAgentConfig',
          );
        },
      },
    ),

  internal_dispatchAgentMap: (id, config, actions) => {
    const agentMap = produce(get().agentMap, (draft: Record<string, any>) => {
      if (!draft[id]) {
        draft[id] = config;
      } else {
        draft[id] = merge(draft[id], config);
      }
    });

    if (isEqual(get().agentMap, agentMap)) return;

    set({ agentMap }, false, 'dispatchAgent' + (actions ? `/${actions}` : ''));
  },

  internal_refreshAgentConfig: async (id) => {
    await mutate([FETCH_AGENT_CONFIG_KEY, id]);
  },

  internal_updateAgentConfig: async (id, data, signal) => {
    // optimistic update
    get().internal_dispatchAgentMap(id, data, 'optimistic_updateAgentConfig');

    await sessionService.updateSessionConfig(id, data, signal);
    await get().internal_refreshAgentConfig(id);

    // 始终刷新 sessions，确保 sessions 数组中的 config 与后端保持同步
    // （不仅限于 model 变更，engineType 等字段变更同样需要刷新）
    await get().refreshSessions();
  },

  internal_createAbortController: (key) => {
    const abortController = get()[key] as AbortController | undefined;
    if (abortController) abortController.abort(MESSAGE_CANCEL_FLAT);
    const controller = new AbortController();
    set({ [key]: controller }, false, 'internal_createAbortController');
    return controller;
  },
});
