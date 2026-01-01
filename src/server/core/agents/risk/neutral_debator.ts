import { StateAnnotation } from '../../graph/tradeDecision/agentState';
import { ChatOpenAI } from '@langchain/openai';
import type { Logger } from '@server/base/logger';

/**
 * 中性风险分析师
 */
export const NEUTRAL_ANALYST_NODE = 'Neutral_Analyst';

export function create_neutral_analyst(llm: ChatOpenAI, logger: Logger) {
  async function neutral_node(state: typeof StateAnnotation.State) {
    logger.info('===== 中性风险分析师 =====');
    const risk_debate_state = state.risk_debate_state;
    const history = risk_debate_state.history || '';
    const neutral_history = risk_debate_state.neutral_history || '';

    const current_risky_response = risk_debate_state.current_risky_response || '';
    const current_safe_response = risk_debate_state.current_safe_response || '';

    const market_research_report = state.market_report || '';
    const sentiment_report = state.sentiment_report || '';
    const news_report = state.news_report || '';
    const fundamentals_report = state.fundamentals_report || '';

    const trader_decision = state.investment_plan || '';

    const prompt = `作为中性风险分析师，您的职责是在高风险和低风险策略之间寻求平衡，提供基于数据的客观分析。在评估交易员的决策或计划时，请综合考虑各方观点，重点关注风险调整后的回报、投资组合平衡和长期可持续性。使用提供的市场数据和情绪分析来支持您的立场，并对极端观点提出建设性的批评。

具体来说，请直接回应激进和保守分析师提出的每个观点，用数据驱动的分析和平衡的推理进行评估。突出过度冒险和过度保守可能带来的问题，并提出一个既考虑增长机会又考虑下行保护的中间路线。以下是交易员的决策：

${trader_decision}

您的任务是通过平衡激进和保守立场来为交易员的决策创建一个令人信服的案例，证明为什么您的平衡视角提供了最佳的前进道路。将以下来源的见解纳入您的论点：

市场研究报告：${market_research_report}
社交媒体情绪报告：${sentiment_report}
最新世界事务报告：${news_report}
公司基本面报告：${fundamentals_report}
以下是当前对话历史：${history} 以下是激进分析师的最后论点：${current_risky_response} 以下是保守分析师的最后论点：${current_safe_response}。如果其他观点没有回应，请不要虚构，只需提出您的观点。

积极参与，解决提出的任何具体担忧，评估各方逻辑的优缺点，并断言平衡方法的好处。专注于辩论和说服，而不仅仅是呈现数据。挑战每个极端观点，强调为什么平衡方法是最优的。请用中文以对话方式输出，就像您在说话一样，不使用任何特殊格式。`;

    logger.debug('Neutral Analyst: Invoking LLM with prompt');
    const response = await llm.invoke(prompt);

    const argument = `Neutral Analyst: ${response.content}`;

    const new_risk_debate_state = {
      history: history + '\n' + argument,
      neutral_history: neutral_history + '\n' + argument,
      risky_history: risk_debate_state.risky_history || '',
      safe_history: risk_debate_state.safe_history || '',
      latest_speaker: 'Neutral',
      current_neutral_response: argument,
      current_risky_response: risk_debate_state.current_risky_response || '',
      current_safe_response: risk_debate_state.current_safe_response || '',
      count: (risk_debate_state.count || 0) + 1,
    };

    return { risk_debate_state: new_risk_debate_state };
  }

  return neutral_node;
}
