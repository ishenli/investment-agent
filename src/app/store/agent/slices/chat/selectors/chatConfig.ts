import { DEFAULT_AGENT_CHAT_CONFIG, DEFAULT_AGENT_SEARCH_FC_MODEL } from '@renderer/const/settings';
import { AgentStoreState } from '@renderer/store/agent/initialState';
import { LobeAgentChatConfig } from '@typings/agent';

import { currentAgentConfig } from './agent';

export const currentAgentChatConfig = (s: AgentStoreState): LobeAgentChatConfig =>
  currentAgentConfig(s).chatConfig || {};

const agentSearchMode = (s: AgentStoreState) => currentAgentChatConfig(s).searchMode || 'off';
const isAgentEnableSearch = (s: AgentStoreState) => agentSearchMode(s) !== 'off';

const useModelBuiltinSearch = (s: AgentStoreState) =>
  currentAgentChatConfig(s).useModelBuiltinSearch;

const searchFCModel = () => DEFAULT_AGENT_SEARCH_FC_MODEL;

const enableHistoryCount = (s: AgentStoreState) => {
  const chatConfig = currentAgentChatConfig(s);

  return chatConfig.enableHistoryCount;
};

const historyCount = (s: AgentStoreState): number => {
  const chatConfig = currentAgentChatConfig(s);

  return chatConfig.historyCount ?? (DEFAULT_AGENT_CHAT_CONFIG.historyCount as number); // historyCount 为 0 即不携带历史消息
};

const displayMode = (s: AgentStoreState) => {
  const chatConfig = currentAgentChatConfig(s);

  return chatConfig.displayMode || 'chat';
};

const enableHistoryDivider =
  (historyLength: number, currentIndex: number) => (s: AgentStoreState) => {
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
