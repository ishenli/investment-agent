import type { Logger } from '@server/base/logger';
import { StateAnnotation } from '../../graph/tradeDecision/agentState';
import { ChatOpenAI } from '@langchain/openai';

/**
 * 保守风险分析师
 */
export const SAFE_ANALYST_NODE = 'Safe_Analyst';

export function create_safe_debator(llm: ChatOpenAI, logger: Logger) {
  async function safe_node(state: typeof StateAnnotation.State) {
    logger.info('===== 保守风险分析师 =====');

    const risk_debate_state = state.risk_debate_state;
    const history = risk_debate_state.history || '';
    const safe_history = risk_debate_state.safe_history || '';

    const current_risky_response = risk_debate_state.current_risky_response || '';
    const current_neutral_response = risk_debate_state.current_neutral_response || '';

    const market_research_report = state.market_report || '';
    const sentiment_report = state.sentiment_report || '';
    const news_report = state.news_report || '';
    const fundamentals_report = state.fundamentals_report || '';

    const trader_decision = state.investment_plan || '';

    const prompt = `作为保守风险分析师，您的职责是倡导低风险、稳健的投资策略，强调资本保护和长期稳定性。在评估交易员的决策或计划时，请重点关注潜在的下行风险、资本保值和避免重大损失。使用提供的市场数据和情绪分析来加强您的论点，并对高风险策略提出谨慎的警告。

具体来说，请直接回应激进和中性分析师提出的每个观点，用数据驱动的分析和保守的推理进行反驳。突出过度冒险可能带来的严重后果，并强调谨慎方法的长期价值。以下是交易员的决策：

${trader_decision}

您的任务是通过质疑和批评激进和中性立场来为交易员的决策创建一个令人信服的案例，证明为什么您的保守视角提供了最佳的前进道路。将以下来源的见解纳入您的论点：

市场研究报告：${market_research_report}
社交媒体情绪报告：${sentiment_report}
最新世界事务报告：${news_report}
公司基本面报告：${fundamentals_report}
以下是当前对话历史：${history} 以下是激进分析师的最后论点：${current_risky_response} 以下是中性分析师的最后论点：${current_neutral_response}。如果其他观点没有回应，请不要虚构，只需提出您的观点。

积极参与，解决提出的任何具体担忧，指出他们逻辑中的风险，并断言保守方法的好处。专注于辩论和说服，而不仅仅是呈现数据。挑战每个高风险观点，强调为什么保守方法是最优的。请用中文以对话方式输出，就像您在说话一样，不使用任何特殊格式。`;

    logger.debug('Safe Analyst: Invoking LLM with prompt');
    const response = await llm.invoke(prompt);

    const argument = `Safe Analyst: ${response.content}`;

    const new_risk_debate_state = {
      history: history + '\n' + argument,
      safe_history: safe_history + '\n' + argument,
      risky_history: risk_debate_state.risky_history || '',
      neutral_history: risk_debate_state.neutral_history || '',
      latest_speaker: 'Safe',
      current_safe_response: argument,
      current_risky_response: risk_debate_state.current_risky_response || '',
      current_neutral_response: risk_debate_state.current_neutral_response || '',
      count: (risk_debate_state.count || 0) + 1,
    };

    return { risk_debate_state: new_risk_debate_state };
  }

  return safe_node;
}
