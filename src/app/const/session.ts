import { LobeAgentSession, LobeSessionType } from '@typings/session';
import { DEFAULT_AGENT_META, DEFAULT_INBOX_AVATAR } from './meta';
import { DEFAULT_AGENT_CONFIG } from './settings/agent';
import { LobeAgentConfig } from '@typings/agent';

export const INBOX_SESSION_ID = 'inbox';

export const WELCOME_GUIDE_CHAT_ID = 'welcome';

export const DEFAULT_AGENT_LOBE_SESSION: LobeAgentSession = {
  config: DEFAULT_AGENT_CONFIG,
  createdAt: new Date(),
  updatedAt: new Date(),
  id: '',
  meta: DEFAULT_AGENT_META,
  model: DEFAULT_AGENT_CONFIG.model,
  type: LobeSessionType.Agent,
  agentId: '',
};

// ============================================================
// Inbox Session Configuration
// inbox 是系统基础 Agent，保留硬编码配置
// 其他 Agent 从数据库 agent 表读取
// ============================================================

export const INBOX_SESSION_CONFIG: SessionCreateConfig = {
  slug: INBOX_SESSION_ID,
  agentId: 'investment_advisor',
  title: 'Investment Advisor',
  description: 'Investment Research Analysis',
  includeCreatedAt: true,
  avatar: DEFAULT_INBOX_AVATAR,
  backgroundColor: 'rgba(0,0,0,0)',
};

// 基础配置模板
const createAgentConfig = (overrides: Partial<LobeAgentConfig> = {}) => ({
  ...DEFAULT_AGENT_CONFIG,
  ...overrides,
});

// 统一的会话配置映射，只包含 inbox
// 其他 Agent（如 market_information）从数据库 agent 表读取
export const SESSION_CONFIG_MAP = {
  inbox: {
    sessionConfig: INBOX_SESSION_CONFIG,
    agentConfig: createAgentConfig({}),
    defaultEnabled: true,
  },
} as const;

// 以 map 键为唯一 ID 的初始化配置结构
export interface SessionInitItem {
  enabled?: boolean;
  config?: Partial<LobeAgentConfig>;
}

export type SessionInitConfig = Partial<Record<keyof typeof SESSION_CONFIG_MAP, SessionInitItem>>;

// 由 map 派生默认初始化配置（单一来源）
export const buildDefaultSessionInitConfig = (): SessionInitConfig =>
  Object.entries(SESSION_CONFIG_MAP).reduce((acc, [id, item]) => {
    acc[id as keyof typeof SESSION_CONFIG_MAP] = {
      enabled: !!(item as any).defaultEnabled,
      config: (item as any).agentConfig,
    };
    return acc;
  }, {} as SessionInitConfig);

export const DEFAULT_SESSION_INIT_CONFIG: SessionInitConfig = buildDefaultSessionInitConfig();

export interface SessionCreateConfig {
  /** 会话的唯一标识符 */
  slug: string;
  /** Agent ID */
  agentId: string;
  /** 会话标题 */
  title: string;
  /** 会话描述 */
  description: string;
  /** 是否包含创建时间 */
  includeCreatedAt?: boolean;

  /** 会话头像 */
  avatar?: string;
  /** 会话背景色 */
  backgroundColor?: string;
}
