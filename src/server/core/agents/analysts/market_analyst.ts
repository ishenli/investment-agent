import { ChatOpenAI } from '@langchain/openai';
import { StateAnnotation } from '../../graph/tradeDecision/agentState';
import { get } from 'lodash';
import { StockUtils } from '../../utils/stockUtils/index';
import { HumanMessage, SystemMessage } from 'langchain';
import * as toolkit from '../../tools/index';
import { createAgent } from 'langchain';
import type { Logger } from '@server/base/logger';

export function create_market_analyst(llm: ChatOpenAI, logger: Logger) {
  async function market_analyst_node(state: typeof StateAnnotation.State) {
    logger.debug('📈 [DEBUG] ===== 市场分析师节点开始 =====');
    const current_date = state.trade_date;
    const ticker = state.company_of_interest;

    logger.debug(`📈 [DEBUG] 输入参数: ticker=${ticker}, date=${current_date}`);
    logger.debug(`📈 [DEBUG] 当前状态中的消息数量: ${get(state, 'messages', []).length}`);
    logger.debug(`📈 [DEBUG] 现有市场报告: ${get(state, 'market_report', 'None')}`);

    const market_info = StockUtils.getMarketInfo(ticker);

    logger.debug(
      `📈 [DEBUG] 股票类型检查: ${ticker} -> ${market_info['market_name']} (${market_info['currency_name']})`,
    );

    const company_name = await StockUtils.getCompanyInfo(ticker, market_info);

    logger.debug(`📈 [DEBUG] 公司名称: ${ticker} -> ${company_name}`);

    const system_message = `你是一位专业的股票技术分析师。你必须对${company_name}（股票代码：${ticker}）进行详细的技术分析。

**股票信息：**
- 公司名称：${company_name}
- 股票代码：${ticker}
- 所属市场：${market_info['market_name']}
- 计价货币：${market_info['currency_name']}（${market_info['currency_symbol']}）

**工具调用指令：**
你有一个工具叫做get_stock_market_data_unified，你必须立即调用这个工具来获取${company_name}（${ticker}）的市场数据。
不要说你将要调用工具，直接调用工具。

**分析要求：**
1. 调用工具后，基于获取的真实数据进行技术分析
2. 分析移动平均线、MACD、RSI、布林带等技术指标
3. 考虑{market_info['market_name']}市场特点进行分析
4. 提供具体的数值和专业分析
5. 给出明确的投资建议
6. 所有价格数据使用${market_info['currency_name']}（${market_info['currency_symbol']}）表示

**输出格式：**
## 📊 股票基本信息
- 公司名称：${company_name}
- 股票代码：${ticker}
- 所属市场：${market_info['market_name']}

## 📈 技术指标分析
## 📉 价格趋势分析
## 💭 投资建议

请使用中文，基于真实数据进行分析。确保在分析中正确使用公司名称"${company_name}"和股票代码"${ticker}".`;

    const tools = [new toolkit.StockMarketDataUnifiedTool(logger)];
    const tool_names = [];

    for (const tool of tools) {
      if (tool.name) {
        tool_names.push(tool.name);
      } else {
        tool_names.push(String(tool));
      }
    }

    // 拼接 AI 的消息
    const messages = [
      new SystemMessage(`
你是一位专业的股票技术分析师，与其他分析师协作。
使用提供的工具来获取和分析股票数据。
如果你无法完全回答，没关系；其他分析师会从不同角度继续分析。
执行你能做的技术分析工作来取得进展。
如果你有明确的技术面投资建议：**买入/持有/卖出**，
请在你的回复中明确标注，但不要使用'最终交易建议'前缀，因为最终决策需要综合所有分析师的意见。
你可以使用以下工具：${tool_names}。\n${system_message}
供你参考，当前日期是${current_date}。
我们要分析的是${company_name}（股票代码：${ticker}）。
请确保所有分析都使用中文，并在分析中正确区分公司名称和股票代码。`),
      ...state.messages,
    ];

    const agent = createAgent({
      model: llm.bindTools(tools),
      tools: tools,
    });
    // const result = await llm.bindTools(tools).invoke(messages);
    // logger.debug(`📈 [DEBUG] 市场分析师节点输出: ${result}`);
    const agent_result = await agent.invoke({
      messages,
    });

    const analysis_prompt = `现在请基于上述工具获取的数据，生成详细的技术分析报告。
要求：
1. 报告必须基于工具返回的真实数据进行分析
2. 包含具体的技术指标数值和专业分析
3. 提供明确的投资建议和风险提示
4. 报告长度不少于800字
5. 使用中文撰写

请分析股票${ticker}的技术面情况，包括：
- 价格趋势分析
- 技术指标解读
- 支撑阻力位分析
- 成交量分析
- 投资建议`;
    const final_result = await llm.invoke([
      ...state.messages,
      ...agent_result.messages,
      new HumanMessage(analysis_prompt),
    ]);

    //       final_result = await llm.invoke(messages);
    const report = final_result.content;
    logger.info(`📊 [市场分析师] 生成完整分析报告，长度: ${report.length}`);
    return {
      messages: [...agent_result.messages, final_result],
      market_report: report,
    };
  }
  return market_analyst_node;
}
