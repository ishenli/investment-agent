import { sessionService } from '@renderer/services/session';
import { SessionStore } from '@renderer/store/session';
import { MetaData } from '@typings/meta';
import {
  ChatSessionList,
  LobeAgentSession,
  LobeSessions,
  LobeSessionType,
  UpdateSessionParams,
} from '@typings/session';
import useSWR, { SWRResponse } from 'swr';
import type { PartialDeep } from 'type-fest';
import { StateCreator } from 'zustand/vanilla';

import { LobeSessionGroups } from '@typings/session/sessionGroup';
import { useClientDataSWR } from '@renderer/lib/utils/swr';
import { isEqual } from 'lodash';
import { SessionDispatch } from './reducers';

const FETCH_SESSIONS_KEY = 'fetchSessions';
const SEARCH_SESSIONS_KEY = 'searchSessions';

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
  /* eslint-enable */
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
    if (activeId && activeId !== 'inbox') {
      await get().internal_updateSession(activeId, { meta });
    }
  },

  pinSession: async (id, pinned) => {
    await get().internal_updateSession(id, { pinned });
  },

  refreshSessions: async () => {
    const result = await sessionService.getGroupedSessions();
    get().internal_processSessions(result.sessions, result.sessionGroups);
  },

  removeSession: async (sessionId) => {
    await sessionService.removeSession(sessionId);
    await get().refreshSessions();

    // 如果删除的是当前活跃会话，切换到收件箱
    if (sessionId === get().activeId) {
      get().switchSession('inbox');
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
    const sessions = allSessions.filter((item) => item.slug !== 'inbox');

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
});
