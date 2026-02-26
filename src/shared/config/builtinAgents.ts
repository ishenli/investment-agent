/**
 * Builtin Agents Configuration
 *
 * 服务端硬编码的内置 Agent 配置
 * 这些 Agent 会在系统启动时自动初始化到数据库
 */

/**
 * 内置 Agent 配置项
 */
export interface BuiltinAgentConfig {
  /** Agent 唯一标识符（slug） */
  slug: string;
  /** Agent 显示名称 */
  name: string;
  /** Agent 描述 */
  description?: string;
  /** 系统提示词 */
  systemRole?: string;
  /** 开场问题列表 */
  openingQuestions?: string[];
  /** Agent Logo URL */
  logo?: string;
}

/**
 * 内置 Agent 配置列表
 *
 * 注意：inbox Agent 不在此列表中，它保留在 SESSION_CONFIG_MAP 中
 */
export const BUILTIN_AGENTS_CONFIG: BuiltinAgentConfig[] = [
  {
    slug: 'market_information',
    name: 'Market Information Analyzer',
    description: 'Market Information Related Queries',
    systemRole: 'You are a professional market information analyzer. You help users analyze market trends, news, and provide insights about stocks and investments.',
    openingQuestions: ['特斯拉的最新消息?', '最近AI的重点消息有哪些?'],
    logo: 'https://mdn.alipayobjects.com/huamei_ptvnul/afts/img/A*WUn6R7s9EiAAAAAASiAAAAgAeg-GAQ/original',
  },
];

/**
 * 获取内置 Agent 的 slug 列表
 */
export const BUILTIN_AGENT_SLUGS = BUILTIN_AGENTS_CONFIG.map(config => config.slug);