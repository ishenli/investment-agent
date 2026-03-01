import type { PartialDeep } from 'type-fest';

import { DEFAULT_AGENT_CONFIG } from '@renderer/const/settings';
import { LobeAgentConfig } from '@typings/agent';
import { INBOX_SESSION_ID } from '@/app/const/session';

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
  activeId: INBOX_SESSION_ID,
  agentConfigInitMap: {},
  agentMap: {},
  defaultAgentConfig: DEFAULT_AGENT_CONFIG,
  isInboxAgentConfigInit: false,
  showAgentSetting: false,
};
