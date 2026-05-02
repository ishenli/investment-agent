import type { Logger } from '@server/base/logger';
import { FinancialSituationMemory, type MemoryItem } from '../../memory/index';
import { StateAnnotation } from '../../graphs/tradeDecision/agentState';
import { ChatOpenAI } from '@langchain/openai';

/**
 * 投资组合经理和辩论主持人
 */
export const RESEARCHER_MANAGER_NODE = 'Research_Manager';

export function create_research_manager(
  llm: ChatOpenAI,
  memory: FinancialSituationMemory | null,
  logger: Logger,
) {
  async function research_manager_node(state: typeof StateAnnotation.State) {
    logger.info('===== 投资组合经理和辩论主持人 =====');
    const history = state.investment_debate_state.history || '';
    const market_research_report = state.market_report || '';
    const sentiment_report = state.sentiment_report || '';
    const news_report = state.news_report || '';
    const fundamentals_report = state.fundamentals_report || '';

    const investment_debate_state = state.investment_debate_state || {};

    const curr_situation = `${market_research_report}\n\n${sentiment_report}\n\n${news_report}\n\n${fundamentals_report}`;

    // # 安全检查：确保memory不为None
    let past_memories: MemoryItem[] = [];
    if (memory != null) {
      past_memories = memory.get_memories(curr_situation, 2);
    } else {
      logger.warn('⚠️ [DEBUG] memory为None，跳过历史记忆检索');
      past_memories = [];
    }
    let past_memory_str = '';
    for (let i = 0; i < past_memories.length; i++) {
      const rec = past_memories[i];
      console.log(rec);
      past_memory_str += rec['recommendation'] + '\n\n';
    }
    const prompt = `作为投资组合经理和辩论主持人，您的职责是批判性地评估这轮辩论并做出明确决策：支持看跌分析师、看涨分析师，或者仅在基于所提出论点有强有力理由时选择持有。

简洁地总结双方的关键观点，重点关注最有说服力的证据或推理。您的建议——买入、卖出或持有——必须明确且可操作。避免仅仅因为双方都有有效观点就默认选择持有；要基于辩论中最强有力的论点做出承诺。

此外，为交易员制定详细的投资计划。这应该包括：

您的建议：基于最有说服力论点的明确立场。
理由：解释为什么这些论点导致您的结论。
战略行动：实施建议的具体步骤。
📊 目标价格分析：基于所有可用报告（基本面、新闻、情绪），提供全面的目标价格区间和具体价格目标。考虑：
- 基本面报告中的基本估值
- 新闻对价格预期的影响
- 情绪驱动的价格调整
- 技术支撑/阻力位
- 风险调整价格情景（保守、基准、乐观）
- 价格目标的时间范围（1个月、3个月、6个月）
💰 您必须提供具体的目标价格 - 不要回复"无法确定"或"需要更多信息"。

考虑您在类似情况下的过去错误。利用这些见解来完善您的决策制定，确保您在学习和改进。以对话方式呈现您的分析，就像自然说话一样，不使用特殊格式。

以下是您对错误的过去反思：
\"{past_memory_str}\"

以下是综合分析报告：
市场研究：${market_research_report}

情绪分析：${sentiment_report}

新闻分析：${news_report}

基本面分析：${fundamentals_report}

以下是辩论：
辩论历史：
${history}

请用中文撰写所有分析内容和建议。`;

    const response = await llm.invoke(prompt);

    const new_investment_debate_state = {
      judge_decision: response.content,
      history: investment_debate_state.history || '',
      bear_history: investment_debate_state.bear_history || '',
      bull_history: investment_debate_state.bull_history || '',
      current_response: response.content,
      count: investment_debate_state.count || 0,
    };

    return {
      investment_debate_state: new_investment_debate_state,
      investment_plan: response.content,
    };
  }

  return research_manager_node;
}
