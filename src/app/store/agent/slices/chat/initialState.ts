import type { PartialDeep } from 'type-fest';

import { DEFAULT_AGENT_CONFIG } from '@renderer/const/settings';
import { LobeAgentConfig } from '@typings/agent';

export interface AgentState {
  activeAgentId?: string;
  activeId: string;
  agentConfigInitMap: Record<string, boolean>;
  agentMap: Record<string, PartialDeep<LobeAgentConfig>>;
  agentSettingInstance?: any | null;
  defaultAgentConfig: LobeAgentConfig;
  isInboxAgentConfigInit: boolean;
  showAgentSetting: boolean;
  updateAgentChatConfigSignal?: AbortController;
  updateAgentConfigSignal?: AbortController;
}

export const initialAgentChatState: AgentState = {
  activeId: 'inbox',
  agentConfigInitMap: {},
  agentMap: {},
  defaultAgentConfig: DEFAULT_AGENT_CONFIG,
  isInboxAgentConfigInit: false,
  showAgentSetting: false,
};
