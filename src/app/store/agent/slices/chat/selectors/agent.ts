import { INBOX_SESSION_ID } from '@renderer/const/session';
import { DEFAULT_AGENT_CONFIG, DEFAULT_MODEL } from '@renderer/const/settings';
import { AgentStoreState } from '@renderer/store/agent/initialState';
import { LobeAgentConfig } from '@typings/agent';
import { merge } from '@renderer/lib/utils/merge';

const isInboxSession = (s: AgentStoreState) => s.activeId === INBOX_SESSION_ID;

// ==========   Config   ============== //

const inboxAgentConfig = (s: AgentStoreState) =>
  merge(DEFAULT_AGENT_CONFIG, s.agentMap[INBOX_SESSION_ID]);
const inboxAgentModel = (s: AgentStoreState) => inboxAgentConfig(s).model;

const getAgentConfigById =
  (id: string) =>
  (s: AgentStoreState): LobeAgentConfig =>
    merge(s.defaultAgentConfig, s.agentMap[id]);

export const currentAgentConfig = (s: AgentStoreState): LobeAgentConfig =>
  getAgentConfigById(s.activeId)(s);

const currentAgentSystemRole = (s: AgentStoreState) => {
  return currentAgentConfig(s).systemRole;
};

const currentAgentModel = (s: AgentStoreState): string => {
  const config = currentAgentConfig(s);

  return config?.model || DEFAULT_MODEL;
};

const currentAgentPlugins = (s: AgentStoreState) => {
  const config = currentAgentConfig(s);

  return config?.plugins || [];
};

const hasSystemRole = (s: AgentStoreState) => {
  const config = currentAgentConfig(s);

  return !!config.systemRole;
};

const isAgentConfigLoading = (s: AgentStoreState) => !s.agentConfigInitMap[s.activeId];

const openingQuestions = (s: AgentStoreState) => currentAgentConfig(s).openingQuestions || [];
const openingMessage = (s: AgentStoreState) => currentAgentConfig(s).openingMessage || '';

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
