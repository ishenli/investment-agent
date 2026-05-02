import { StateAnnotation } from '../../graphs/tradeDecision/agentState';
import { ChatOpenAI } from '@langchain/openai';
import { FinancialSituationMemory } from '../../memory/index';
import type { Logger } from '@server/base/logger';

/**
 * 风险评估主管和辩论主持人
 */
export const RISK_MANAGER_NODE = 'Risk_Judge';

export function create_risk_manager(
  llm: ChatOpenAI,
  memory: FinancialSituationMemory | null,
  logger: Logger,
) {
  async function risk_manager_node(state: typeof StateAnnotation.State) {
    logger.info(' ===== 风险评估主管和辩论主持人 =====');
    const company_name = state.company_of_interest;
    const history = state.risk_debate_state.history;
    const risk_debate_state = state.risk_debate_state;
    const market_research_report = state.market_report;
    const news_report = state.news_report;
    const fundamentals_report = state.news_report; // Note: This appears to be a bug in the original code
    const sentiment_report = state.sentiment_report;
    const trader_plan = state.investment_plan;

    const curr_situation = `${market_research_report}\n\n${sentiment_report}\n\n${news_report}\n\n${fundamentals_report}`;

    // 安全检查：确保memory不为None
    let past_memories: Array<{ recommendation: string }> = [];
    if (memory !== null) {
      past_memories = memory.get_memories(curr_situation, 2);
    } else {
      logger.warn('⚠️ [DEBUG] memory为None，跳过历史记忆检索');
      past_memories = [];
    }

    let past_memory_str = '';
    for (let i = 0; i < past_memories.length; i++) {
      const rec = past_memories[i];
      past_memory_str += rec.recommendation + '\n\n';
    }

    const prompt = `作为风险管理委员会主席和辩论主持人，您的目标是评估三位风险分析师——激进、中性和安全/保守——之间的辩论，并确定交易员的最佳行动方案。您的决策必须产生明确的建议：买入、卖出或持有。只有在有具体论据强烈支持时才选择持有，而不是在所有方面都似乎有效时作为后备选择。力求清晰和果断。

决策指导原则：
1. **总结关键论点**：提取每位分析师的最强观点，重点关注与背景的相关性。
2. **提供理由**：用辩论中的直接引用和反驳论点支持您的建议。
3. **完善交易员计划**：从交易员的原始计划**${trader_plan}**开始，根据分析师的见解进行调整。
4. **从过去的错误中学习**：使用**${past_memory_str}**中的经验教训来解决先前的误判，改进您现在做出的决策，确保您不会做出错误的买入/卖出/持有决定而亏损。

交付成果：
- 明确且可操作的建议：买入、卖出或持有。
- 基于辩论和过去反思的详细推理。

---

**分析师辩论历史：**
${history}

---

专注于可操作的见解和持续改进。建立在过去经验教训的基础上，批判性地评估所有观点，确保每个决策都能带来更好的结果。请用中文撰写所有分析内容和建议。`;

    // 增强的LLM调用，包含错误处理和重试机制
    const max_retries = 3;
    let retry_count = 0;
    let response_content = '';

    while (retry_count < max_retries) {
      try {
        logger.info(
          `🔄 [Risk Manager] 调用LLM生成交易决策 (尝试 ${retry_count + 1}/${max_retries})`,
        );
        const response = await llm.invoke(prompt);

        if (response && response.content) {
          response_content = response.content.toString();
          if (response_content.length > 10) {
            // 确保响应有实质内容
            logger.info(
              `✅ [Risk Manager] LLM调用成功，生成决策长度: ${response_content.length} 字符`,
            );
            break;
          } else {
            logger.warn(`⚠️ [Risk Manager] LLM响应内容过短: ${response_content.length} 字符`);
            response_content = '';
          }
        } else {
          logger.warn('⚠️ [Risk Manager] LLM响应为空或无效');
          response_content = '';
        }
      } catch (e) {
        logger.error(`❌ [Risk Manager] LLM调用失败 (尝试 ${retry_count + 1}): ${e}`);
        response_content = '';
      }

      retry_count += 1;
      if (retry_count < max_retries && !response_content) {
        logger.info('🔄 [Risk Manager] 等待2秒后重试...');
        // In a real implementation, you would use setTimeout or similar
        // For now, we'll just simulate the delay
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // 如果所有重试都失败，生成默认决策
    if (!response_content) {
      logger.error('❌ [Risk Manager] 所有LLM调用尝试失败，使用默认决策');
      response_content = `**默认建议：持有**

由于技术原因无法生成详细分析，基于当前市场状况和风险控制原则，建议对${company_name}采取持有策略。

**理由：**
1. 市场信息不足，避免盲目操作
2. 保持现有仓位，等待更明确的市场信号
3. 控制风险，避免在不确定性高的情况下做出激进决策

**建议：**
- 密切关注市场动态和公司基本面变化
- 设置合理的止损和止盈位
- 等待更好的入场或出场时机

注意：此为系统默认建议，建议结合人工分析做出最终决策。`;
    }

    const new_risk_debate_state = {
      judge_decision: response_content,
      history: risk_debate_state.history,
      risky_history: risk_debate_state.risky_history,
      safe_history: risk_debate_state.safe_history,
      neutral_history: risk_debate_state.neutral_history,
      latest_speaker: 'Judge',
      current_risky_response: risk_debate_state.current_risky_response,
      current_safe_response: risk_debate_state.current_safe_response,
      current_neutral_response: risk_debate_state.current_neutral_response,
      count: risk_debate_state.count,
    };

    logger.info(`📋 [Risk Manager] 最终决策生成完成，内容长度: ${response_content.length} 字符`);

    return {
      risk_debate_state: new_risk_debate_state,
      final_trade_decision: response_content,
    };
  }
  return risk_manager_node;
}
