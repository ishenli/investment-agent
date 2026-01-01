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

// Session 初始化配置在下方基于 SESSION_CONFIG_MAP 的键定义

// 预定义的会话配置
export const INBOX_SESSION_CONFIG: SessionCreateConfig = {
  slug: 'inbox',
  agentId: 'investment_advisor',
  title: '投研综合分析智能体',
  description: '随便聊聊',
  includeCreatedAt: true,
  avatar: DEFAULT_INBOX_AVATAR,
  backgroundColor: 'rgba(0,0,0,0)',
};

export const XIAOJIN_BIZ_SESSION_CONFIG: SessionCreateConfig = {
  slug: 'market_information',
  agentId: 'market_information',
  title: '信息收集智能体',
  description: '收集市场上的最新消息',
  includeCreatedAt: false,
  avatar: 'https://mdn.alipayobjects.com/huamei_ptvnul/afts/img/A*WUn6R7s9EiAAAAAASiAAAAgAeg-GAQ/original',
  backgroundColor: 'rgba(0,0,0,0)',
};

export const APP_BIZ_SESSION_CONFIG: SessionCreateConfig = {
  slug: 'app_create',
  agentId: 'app_create',
  title: '应用创建智能体',
  description: '创建各类应用',
  includeCreatedAt: false,
  avatar: '⚒️',
  backgroundColor: 'rgba(0,0,0,0)',
};

// 基础配置模板
const createAgentConfig = (overrides: Partial<LobeAgentConfig> = {}) => ({
  ...DEFAULT_AGENT_CONFIG,
  ...overrides,
});

// 统一的会话配置映射，实际会根据这个走生产，如果已经存入DB，就不管了
export const SESSION_CONFIG_MAP = {
  inbox: {
    sessionConfig: INBOX_SESSION_CONFIG,
    agentConfig: createAgentConfig({}),
    defaultEnabled: true,
  },
  xiaojinBiz: {
    sessionConfig: XIAOJIN_BIZ_SESSION_CONFIG,
    agentConfig: createAgentConfig({
      openingQuestions: ['特斯拉的最新消息?', '最近AI的重点消息有哪些?'],
    }),
    defaultEnabled: true,
  },
  appBiz: {
    sessionConfig: APP_BIZ_SESSION_CONFIG,
    agentConfig: createAgentConfig({
      openingQuestions: ['如何创建一个应用?', '如何创建一个网站?'],
      systemRole: '你是一个应用创建专家，帮助用户创建各种应用。',
    }),
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
