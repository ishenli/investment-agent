import { StockUtils } from '../../utils/stockUtils/index';
import { StateAnnotation } from '../../graph/tradeDecision/agentState';
import { FinancialSituationMemory, type MemoryItem } from '../../memory/index';
import { ChatOpenAI } from '@langchain/openai';
import type { Logger } from '@server/base/logger';

/**
 * 看跌研究员
 */
export const BEAR_RESEARCHER_NODE = 'Bear_Researcher';

export function create_bear_researcher(
  llm: ChatOpenAI,
  memory: FinancialSituationMemory,
  logger: Logger,
) {
  async function bear_node(state: typeof StateAnnotation.State) {
    logger.info('🐻 ===== 看跌研究员节点开始 =====');

    const investment_debate_state = state.investment_debate_state;
    const history = investment_debate_state.history || '';
    const bull_history = investment_debate_state.bull_history || '';

    const current_response = investment_debate_state.current_response || '';
    const market_research_report = state.market_report;
    const sentiment_report = state.sentiment_report;
    const news_report = state.news_report;
    const fundamentals_report = state.fundamentals_report;

    // # 使用统一的股票类型检测
    const company_name = state.company_of_interest || 'Unknown';
    const market_info = StockUtils.getMarketInfo(company_name);
    const is_china = market_info['is_china'];
    const is_hk = market_info['is_hk'];
    const is_us = market_info['is_us'];

    const currency = market_info['currency_name'];
    const currency_symbol = market_info['currency_symbol'];

    logger.debug('🐻 [DEBUG] 接收到的报告:');
    logger.debug('🐻 [DEBUG] - 市场报告长度: ' + market_research_report.length);
    logger.debug('🐻 [DEBUG] - 情绪报告长度: ' + sentiment_report.length);
    logger.debug('🐻 [DEBUG] - 新闻报告长度: ' + news_report.length);
    logger.debug('🐻 [DEBUG] - 基本面报告长度: ' + fundamentals_report.length);
    logger.debug(
      '🐻 [DEBUG] - 基本面报告前200字符: ' + fundamentals_report.substring(0, 200) + '...',
    );
    logger.debug(
      '🐻 [DEBUG] - 股票代码: ' +
        company_name +
        ', 类型: ' +
        market_info['market_name'] +
        ', 货币: ' +
        currency,
    );
    logger.debug(`🐂 [DEBUG] - 市场详情: 中国A股=${is_china}, 港股=${is_hk}, 美股=${is_us}`);

    const curr_situation = `${market_research_report}

${sentiment_report}

${news_report}

${fundamentals_report}`;

    // # 安全检查：确保memory不为None
    let past_memories: MemoryItem[] = [];
    if (memory) {
      past_memories = memory.get_memories(curr_situation, 2);
    } else {
      logger.warn('⚠️ [DEBUG] memory为None，跳过历史记忆检索');
      past_memories = [];
    }

    let past_memory_str = '';
    for (let i = 0; i < past_memories.length; i++) {
      const rec = past_memories[i];
      past_memory_str += rec['recommendation'] + '\n\n';
    }

    const prompt = `你是一位看跌分析师，负责论证不投资股票 {company_name} 的理由。

⚠️ 重要提醒：当前分析的是 ${market_info['market_name']}，所有价格和估值请使用 ${currency}（${currency_symbol}）作为单位。

你的目标是提出合理的论证，强调风险、挑战和负面指标。利用提供的研究和数据来突出潜在的不利因素并有效反驳看涨论点。

请用中文回答，重点关注以下几个方面：

- 风险和挑战：突出市场饱和、财务不稳定或宏观经济威胁等可能阻碍股票表现的因素
- 竞争劣势：强调市场地位较弱、创新下降或来自竞争对手威胁等脆弱性
- 负面指标：使用财务数据、市场趋势或最近不利消息的证据来支持你的立场
- 反驳看涨观点：用具体数据和合理推理批判性分析看涨论点，揭露弱点或过度乐观的假设
- 参与讨论：以对话风格呈现你的论点，直接回应看涨分析师的观点并进行有效辩论，而不仅仅是列举事实

可用资源：

市场研究报告：${market_research_report}
社交媒体情绪报告：${sentiment_report}
最新世界事务新闻：${news_report}
公司基本面报告：${fundamentals_report}
辩论对话历史：${history}
最后的看涨论点：${current_response}
类似情况的反思和经验教训：${past_memory_str}

请使用这些信息提供令人信服的看跌论点，反驳看涨声明，并参与动态辩论，展示投资该股票的风险和弱点。你还必须处理反思并从过去的经验教训和错误中学习。

请确保所有回答都使用中文。
`;

    const response = await llm.invoke(prompt);

    const argument = `Bear Analyst: ${response.content}`;

    const new_investment_debate_state = {
      history: history + '\n' + argument,
      bull_history: bull_history + '\n' + argument,
      bear_history: investment_debate_state.bear_history || '',
      current_response: argument,
      count: investment_debate_state.count + 1,
    };

    return { investment_debate_state: new_investment_debate_state };
  }
  return bear_node;
}
