import { DEFAULT_AGENT_LOBE_SESSION, INBOX_SESSION_ID } from '@renderer/const/session';
import { sessionHelpers } from '@renderer/store/session/slices/session/helpers';
import { MetaData } from '@typings/meta';
import { CustomSessionGroup, LobeAgentSession, LobeSessions } from '@typings/session';
import { EngineType, LobeAgentConfig } from '@typings/agent';
import { DEFAULT_MODEL } from '@renderer/const/settings';

import { SessionStore } from '../../../store';

const defaultSessions = (s: SessionStore): LobeSessions => s.defaultSessions;
const pinnedSessions = (s: SessionStore): LobeSessions => s.pinnedSessions;
const customSessionGroups = (s: SessionStore): CustomSessionGroup[] => s.customSessionGroups;

const allSessions = (s: SessionStore): LobeSessions => s.sessions;

const getSessionById =
  (id: string) =>
  (s: SessionStore): LobeAgentSession =>
    sessionHelpers.getSessionById(id, allSessions(s));

const getSessionMetaById =
  (id: string) =>
  (s: SessionStore): MetaData => {
    const session = getSessionById(id)(s);

    if (!session) return {};
    return session.meta;
  };

const currentSession = (s: SessionStore): LobeAgentSession | undefined => {
  if (!s.activeId) return;

  if (s.activeId === INBOX_SESSION_ID) {
    return allSessions(s).find((i) => i.slug === INBOX_SESSION_ID);
  }

  return allSessions(s).find((i) => i.id === s.activeId);
};

const currentSessionSafe = (s: SessionStore): LobeAgentSession => {
  return currentSession(s) || DEFAULT_AGENT_LOBE_SESSION;
};

// ==========   Config Selectors   ============== //

/**
 * 获取当前 Session 的完整配置
 */
const currentSessionConfig = (s: SessionStore): LobeAgentConfig => {
  const session = currentSession(s);
  return session?.config || {} as LobeAgentConfig;
};

/**
 * 获取指定 Session 的配置
 */
const getSessionConfigById =
  (id: string) =>
  (s: SessionStore): LobeAgentConfig => {
    const session = getSessionById(id)(s);
    return session?.config || {};
  };

/**
 * 获取当前 Session 使用的模型名称
 */
const currentSessionModel = (s: SessionStore): string => {
  return currentSessionConfig(s).model || DEFAULT_MODEL;
};

/**
 * 获取当前 Session 使用的 Provider
 */
const currentSessionProvider = (s: SessionStore): string => {
  return currentSessionConfig(s).provider || '';
};

/**
 * 获取当前 Session 使用的 Engine 类型
 */
const currentSessionEngineType = (s: SessionStore): EngineType => {
  return currentSessionConfig(s).engineType || 'deepagents';
};

/**
 * 获取当前 Session 的 systemRole
 */
const currentSessionSystemRole = (s: SessionStore): string => {
  return currentSessionConfig(s).systemRole || '';
};

/**
 * 获取当前 Session 的插件列表
 */
const currentSessionPlugins = (s: SessionStore): string[] => {
  return currentSessionConfig(s).plugins || [];
};

/**
 * 判断当前 Session 是否有 systemRole
 */
const hasSystemRole = (s: SessionStore): boolean => {
  return !!currentSessionConfig(s).systemRole;
};

/**
 * 获取当前 Session 的开场问题列表
 */
const openingQuestions = (s: SessionStore): string[] => {
  return currentSessionConfig(s).openingQuestions || [];
};

/**
 * 获取当前 Session 的开场消息
 */
const openingMessage = (s: SessionStore): string => {
  return currentSessionConfig(s).openingMessage || '';
};

const hasCustomAgents = (s: SessionStore) => defaultSessions(s).length > 0;

const isInboxSession = (s: SessionStore) => s.activeId === INBOX_SESSION_ID;

const isSessionListInit = (s: SessionStore) => s.isSessionsFirstFetchFinished;

// use to judge whether a session is fully activated
const isSomeSessionActive = (s: SessionStore) => !!s.activeId && isSessionListInit(s);

export const sessionSelectors = {
  currentSession,
  currentSessionSafe,
  customSessionGroups,
  defaultSessions,
  getSessionById,
  getSessionMetaById,
  hasCustomAgents,
  isInboxSession,
  isSessionListInit,
  isSomeSessionActive,
  pinnedSessions,
  // Config selectors
  currentSessionConfig,
  getSessionConfigById,
  currentSessionModel,
  currentSessionProvider,
  currentSessionEngineType,
  currentSessionSystemRole,
  currentSessionPlugins,
  hasSystemRole,
  openingQuestions,
  openingMessage,
};
