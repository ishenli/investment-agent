import { FinancialSituationMemory } from '../../memory/index';
import { ChatOpenAI } from '@langchain/openai';
import { StateAnnotation } from '../../graph/tradeDecision/agentState';
import { StockUtils } from '../../utils/stockUtils/index';
import type { Logger } from '@server/base/logger';

/**
 * 交易员
 */
export const TRADE_NODE = 'Trader';

export function create_trader(llm: ChatOpenAI, memory: FinancialSituationMemory, logger: Logger) {
  async function trader_node(state: typeof StateAnnotation.State) {
    logger.info('===== 交易员 =====');
    const company_name = state.company_of_interest;
    const investment_plan = state.investment_debate_state;
    const market_research_report = state.market_report;
    const sentiment_report = state.sentiment_report;
    const news_report = state.news_report;
    const fundamentals_report = state.fundamentals_report;

    // # 使用统一的股票类型检测
    const market_info = StockUtils.getMarketInfo(company_name);
    const is_china = market_info['is_china'];
    const is_hk = market_info['is_hk'];
    const is_us = market_info['is_us'];

    // # 根据股票类型确定货币单位
    const currency = market_info['currency_name'];
    const currency_symbol = market_info['currency_symbol'];

    logger.debug('💰 [DEBUG] ===== 交易员节点开始 =====');
    logger.debug(
      `💰 [DEBUG] 交易员检测股票类型: {company_name} -> {market_info['market_name']}, 货币: ${currency}`,
    );
    logger.debug(`💰 [DEBUG] 货币符号: ${currency_symbol}`);
    logger.debug(`💰 [DEBUG] 市场详情: 中国A股=${is_china}, 港股=${is_hk}, 美股=${is_us}`);
    logger.debug('💰 [DEBUG] 基本面报告长度: {len(fundamentals_report)}');
    logger.debug('💰 [DEBUG] 基本面报告前200字符: {fundamentals_report[:200]}...');

    const curr_situation = `${market_research_report}

${sentiment_report}

${news_report}

${fundamentals_report}`;

    // # 检查memory是否可用
    let past_memories = [];
    let past_memory_str;
    if (memory != null) {
      logger.debug('⚠️ [DEBUG] memory可用，获取历史记忆');
      past_memories = memory.get_memories(curr_situation, 2);
      past_memory_str = '';
      for (let i = 0; i < past_memories.length; i++) {
        const rec = past_memories[i];
        past_memory_str += rec['recommendation'] + '\n\n';
      }
    } else {
      logger.debug('⚠️ [DEBUG] memory为None，跳过历史记忆检索');
      past_memories = [];
      past_memory_str = '暂无历史记忆数据可参考。';
    }

    const messages = [
      {
        role: 'system',
        content: `您是一位专业的交易员，负责分析市场数据并做出投资决策。基于您的分析，请提供具体的买入、卖出或持有建议。

⚠️ 重要提醒：当前分析的股票代码是 ${company_name}，请使用正确的货币单位：${currency}（${currency_symbol}）

🔴 严格要求：
- 股票代码 ${company_name} 的公司名称必须严格按照基本面报告中的真实数据
- 绝对禁止使用错误的公司名称或混淆不同的股票
- 所有分析必须基于提供的真实数据，不允许假设或编造
- **必须提供具体的目标价位，不允许设置为null或空值**

请在您的分析中包含以下关键信息：
1. **投资建议**: 明确的买入/持有/卖出决策
2. **目标价位**: 基于分析的合理目标价格(${currency}) - 🚨 强制要求提供具体数值
   - 买入建议：提供目标价位和预期涨幅
   - 持有建议：提供合理价格区间（如：${currency_symbol}XX-XX）
   - 卖出建议：提供止损价位和目标卖出价
3. **置信度**: 对决策的信心程度(0-1之间)
4. **风险评分**: 投资风险等级(0-1之间，0为低风险，1为高风险)
5. **详细推理**: 支持决策的具体理由

🎯 目标价位计算指导：
- 基于基本面分析中的估值数据（P/E、P/B、DCF等）
- 参考技术分析的支撑位和阻力位
- 考虑行业平均估值水平
- 结合市场情绪和新闻影响
- 即使市场情绪过热，也要基于合理估值给出目标价

特别注意：
- 如果是中国A股（6位数字代码），请使用人民币（¥）作为价格单位
- 如果是美股或港股，请使用美元（$）作为价格单位
- 目标价位必须与当前股价的货币单位保持一致
- 必须使用基本面报告中提供的正确公司名称
- **绝对不允许说"无法确定目标价"或"需要更多信息"**

请用中文撰写分析内容，并始终以'最终交易建议: **买入/持有/卖出**'结束您的回应以确认您的建议。

请不要忘记利用过去决策的经验教训来避免重复错误。以下是类似情况下的交易反思和经验教训: ${past_memory_str}`,
      },
      {
        role: 'user',
        content: `Based on a comprehensive analysis by a team of analysts, here is an investment plan tailored for ${company_name}. This plan incorporates insights from current technical market trends, macroeconomic indicators, and social media sentiment. Use this plan as a foundation for evaluating your next trading decision.
            
Proposed Investment Plan: ${investment_plan}
            
Leverage these insights to make an informed and strategic decision.`,
      },
    ];

    logger.debug(`💰 [DEBUG] 准备调用LLM，系统提示包含货币: {currency}`);
    logger.debug(`💰 [DEBUG] 系统提示中的关键部分: 目标价格({currency})`);

    const result = await llm.invoke(messages);

    logger.debug(`💰 [DEBUG] LLM调用完成`);
    logger.debug(`💰 [DEBUG] 交易员回复长度: {len(result.content)}`);
    logger.debug(`💰 [DEBUG] 交易员回复前500字符: {result.content[:500]}...`);
    logger.debug(`💰 [DEBUG] ===== 交易员节点结束 =====`);

    return {
      messages: [result],
      trader_investment_plan: result.content,
      sender: 'Trader',
    };
  }

  return trader_node;
}
