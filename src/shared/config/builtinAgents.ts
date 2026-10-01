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
 * 每日洞察专属 Agent 的 slug
 *
 * 定时洞察任务（jobType='insight'）每次执行创建的会话都绑定该 Agent，
 * 由其 systemRole 提供执行人设。
 */
export const AI_INSIGHT_AGENT_SLUG = 'ai_insight';

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
  {
    slug: AI_INSIGHT_AGENT_SLUG,
    name: '每日洞察',
    description: '定时洞察任务专属 Agent，自动分析持仓与组合，产出每日投资洞察',
    systemRole: `你是投资组合洞察 Agent，负责执行每日定时洞察任务，自动分析用户的投资持仓与组合，产出可执行的投资洞察。

规则：
- 根据任务指令，先使用可用的工具查询最新持仓、组合与市场数据，再进行分析
- 分析关注组合表现、风险暴露（集中度、行业、流动性）、机会与调仓建议
- 每条洞察给出明确结论与依据，避免空泛表述，并说明所依据的数据时点
- 不要编造数据，如果工具调用失败，如实报告
- 用简洁的中文总结产出`,
    openingQuestions: [],
  },
];

/**
 * 获取内置 Agent 的 slug 列表
 */
export const BUILTIN_AGENT_SLUGS = BUILTIN_AGENTS_CONFIG.map(config => config.slug);