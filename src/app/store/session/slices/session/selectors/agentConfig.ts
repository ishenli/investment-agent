/**
 * Selectors migrated from AgentStore.
 *
 * These selectors operate on the SessionStore state and read agent config
 * from `agentMap` (optimistic cache) merged with `defaultAgentConfig`.
 * They replace the former `agentSelectors` and `agentChatConfigSelectors`
 * exported by `@renderer/store/agent`.
 */

import { INBOX_SESSION_ID } from '@renderer/const/session';
import {
  DEFAULT_AGENT_CHAT_CONFIG,
  DEFAULT_AGENT_SEARCH_FC_MODEL,
  DEFAULT_MODEL,
} from '@renderer/const/settings';
import { LobeAgentChatConfig, LobeAgentConfig } from '@typings/agent';
import { merge } from '@renderer/lib/utils/merge';

import { SessionStore } from '../../../store';

// ─────────────────────────────────────────────────────────────
// Agent config selectors  (formerly agentSelectors)
// ─────────────────────────────────────────────────────────────

const isInboxSession = (s: SessionStore) => s.activeId === INBOX_SESSION_ID;

const getAgentConfigById =
  (id: string) =>
  (s: SessionStore): LobeAgentConfig =>
    merge(s.defaultAgentConfig, s.agentMap[id]);

export const currentAgentConfig = (s: SessionStore): LobeAgentConfig =>
  getAgentConfigById(s.activeId)(s);

const inboxAgentConfig = (s: SessionStore) =>
  merge(s.defaultAgentConfig, s.agentMap[INBOX_SESSION_ID]);

const inboxAgentModel = (s: SessionStore) => inboxAgentConfig(s).model;

const currentAgentSystemRole = (s: SessionStore) => currentAgentConfig(s).systemRole;

const currentAgentModel = (s: SessionStore): string =>
  currentAgentConfig(s)?.model || DEFAULT_MODEL;

const currentAgentPlugins = (s: SessionStore) => currentAgentConfig(s)?.plugins || [];

const hasSystemRole = (s: SessionStore) => !!currentAgentConfig(s).systemRole;

const isAgentConfigLoading = (s: SessionStore) => !s.agentConfigInitMap[s.activeId];

const openingQuestions = (s: SessionStore) => currentAgentConfig(s).openingQuestions || [];
const openingMessage = (s: SessionStore) => currentAgentConfig(s).openingMessage || '';

export const agentSelectors = {
  currentAgentConfig,
  currentAgentModel,
  currentAgentPlugins,
  currentAgentSystemRole,
  getAgentConfigById,
  hasSystemRole,
  inboxAgentConfig,
  inboxAgentModel,
  isAgentConfigLoading,
  isInboxSession,
  openingMessage,
  openingQuestions,
};

// ─────────────────────────────────────────────────────────────
// Agent chat-config selectors  (formerly agentChatConfigSelectors)
// ─────────────────────────────────────────────────────────────

export const currentAgentChatConfig = (s: SessionStore): LobeAgentChatConfig =>
  currentAgentConfig(s).chatConfig || {};

const agentSearchMode = (s: SessionStore) => currentAgentChatConfig(s).searchMode || 'off';
const isAgentEnableSearch = (s: SessionStore) => agentSearchMode(s) !== 'off';

const useModelBuiltinSearch = (s: SessionStore) =>
  currentAgentChatConfig(s).useModelBuiltinSearch;

const searchFCModel = () => DEFAULT_AGENT_SEARCH_FC_MODEL;

const enableHistoryCount = (s: SessionStore) => currentAgentChatConfig(s).enableHistoryCount;

const historyCount = (s: SessionStore): number => {
  const chatConfig = currentAgentChatConfig(s);
  return chatConfig.historyCount ?? (DEFAULT_AGENT_CHAT_CONFIG.historyCount as number);
};

const displayMode = (s: SessionStore) => currentAgentChatConfig(s).displayMode || 'chat';

const enableHistoryDivider =
  (historyLength: number, currentIndex: number) => (s: SessionStore) => {
    const config = currentAgentChatConfig(s);
    return (
      enableHistoryCount(s) &&
      historyLength > (config.historyCount ?? 0) &&
      config.historyCount === historyLength - currentIndex
    );
  };

export const agentChatConfigSelectors = {
  agentSearchMode,
  currentChatConfig: currentAgentChatConfig,
  displayMode,
  enableHistoryCount,
  enableHistoryDivider,
  historyCount,
  isAgentEnableSearch,
  searchFCModel,
  useModelBuiltinSearch,
};
