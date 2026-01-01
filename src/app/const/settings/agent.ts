import { LobeAgentChatConfig, LobeAgentConfig, LobeAgentTTSConfig } from '@typings/agent';
import { QueryRewriteSystemAgent, SystemAgentItem, UserSystemAgentConfig } from '@typings/llm';

export const DEFAULT_MODEL = 'Qwen3-30B-A3B-Instruct-2507';

export const DEFAULT_PROVIDER = 'ANT';

export const DEFAULT_TRANSITION_MODE: 'smooth' | 'fadeIn' | 'none' = 'smooth';

export const DEFAUTT_AGENT_TTS_CONFIG: LobeAgentTTSConfig = {
  showAllLocaleVoice: false,
  sttLocale: 'auto',
  ttsService: 'openai',
  voice: {
    openai: 'alloy',
  },
};

export const DEFAULT_AGENT_SEARCH_FC_MODEL = {
  model: DEFAULT_MODEL,
  provider: '',
};

export const DEFAULT_AGENT_CHAT_CONFIG: LobeAgentChatConfig = {
  autoCreateTopicThreshold: 2,
  displayMode: 'chat',
  enableAutoCreateTopic: true,
  enableCompressHistory: true,
  enableHistoryCount: true,
  enableReasoning: false,
  historyCount: 20,
  reasoningBudgetToken: 1024,
  searchMode: 'off',
};

export const DEFAULT_AGENT_CONFIG: LobeAgentConfig = {
  chatConfig: DEFAULT_AGENT_CHAT_CONFIG,
  model: DEFAULT_MODEL,
  openingQuestions: [],
  params: {
    frequency_penalty: 0,
    presence_penalty: 0,
    temperature: 1,
    top_p: 1,
  },
  plugins: [],
  provider: '',
  systemRole: '',
};

export const DEFAULT_SYSTEM_AGENT_ITEM: SystemAgentItem = {
  model: DEFAULT_MODEL,
  provider: DEFAULT_PROVIDER,
};

export const DEFAULT_QUERY_REWRITE_SYSTEM_AGENT_ITEM: QueryRewriteSystemAgent = {
  enabled: true,
  model: DEFAULT_MODEL,
  provider: DEFAULT_PROVIDER,
};

export const DEFAULT_SYSTEM_AGENT_CONFIG: UserSystemAgentConfig = {
  agentMeta: DEFAULT_SYSTEM_AGENT_ITEM,
  generationTopic: DEFAULT_SYSTEM_AGENT_ITEM,
  historyCompress: DEFAULT_SYSTEM_AGENT_ITEM,
  queryRewrite: DEFAULT_QUERY_REWRITE_SYSTEM_AGENT_ITEM,
  thread: DEFAULT_SYSTEM_AGENT_ITEM,
  topic: DEFAULT_SYSTEM_AGENT_ITEM,
  translation: DEFAULT_SYSTEM_AGENT_ITEM,
};
