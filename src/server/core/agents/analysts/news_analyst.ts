import { StateAnnotation } from '../../graph/tradeDecision/agentState';
import { StockUtils } from '../../utils/stockUtils/index';
import { ChatOpenAI } from '@langchain/openai';
import { AIMessage, SystemMessage, createAgent } from 'langchain';
import type { Logger } from '@server/base/logger';
import { stockSearchNewsTool } from '../../tools/index';
import { getContentAfterLastThinkTag } from '../../utils/messageUtils';

// Type definitions
interface MarketInfo {
  is_china: boolean;
  is_hk: boolean;
  is_us: boolean;
  market_name: string;
  currency_name: string;
  currency_symbol: string;
}

export function create_news_analyst(llm: ChatOpenAI, logger: Logger) {
  async function news_analyst_node(state: typeof StateAnnotation.State) {
    const start_time = new Date();
    const current_date = state.trade_date;
    const ticker = state.company_of_interest;

    logger.info(`[新闻分析师] 开始分析 ${ticker} 的新闻，交易日期: ${current_date}`);
    const session_id = '未知会话'; // In TypeScript version, we don't have state.get()
    logger.info(`[新闻分析师] 会话ID: ${session_id}，开始时间: ${start_time.toLocaleString()}`);

    // 获取市场信息
    const market_info = StockUtils.getMarketInfo(ticker);
    logger.info(`[新闻分析师] 股票类型: ${market_info.market_name}`);

    // 获取公司名称
    const _get_company_name = (ticker: string, market_info: MarketInfo): string => {
      /**根据股票代码获取公司名称*/
      try {
        if (market_info.is_china) {
          // 中国A股：使用统一接口获取股票信息
          // Mock implementation
          const stock_info = `股票名称:模拟公司名称\n股票代码:${ticker}`;

          // 解析股票名称
          if (stock_info.includes('股票名称:')) {
            const company_name = stock_info.split('股票名称:')[1].split('\n')[0].trim();
            logger.debug(`📊 [DEBUG] 从统一接口获取中国股票名称: ${ticker} -> ${company_name}`);
            return company_name;
          } else {
            logger.warn(`⚠️ [DEBUG] 无法从统一接口解析股票名称: ${ticker}`);
            return `股票代码${ticker}`;
          }
        } else if (market_info.is_hk) {
          // 港股：使用改进的港股工具
          try {
            // Mock implementation
            const company_name = `港股${ticker.replace('.HK', '').replace('.hk', '')}`;
            logger.debug(`📊 [DEBUG] 使用改进港股工具获取名称: ${ticker} -> ${company_name}`);
            return company_name;
          } catch (e) {
            logger.debug(`📊 [DEBUG] 改进港股工具获取名称失败: ${e}`);
            // 降级方案：生成友好的默认名称
            const clean_ticker = ticker.replace('.HK', '').replace('.hk', '');
            return `港股${clean_ticker}`;
          }
        } else if (market_info.is_us) {
          // 美股：使用简单映射或返回代码
          const us_stock_names: Record<string, string> = {
            AAPL: '苹果公司',
            TSLA: '特斯拉',
            NVDA: '英伟达',
            MSFT: '微软',
            GOOGL: '谷歌',
            AMZN: '亚马逊',
            META: 'Meta',
            NFLX: '奈飞',
          };

          const company_name = us_stock_names[ticker.toUpperCase()] || `美股${ticker}`;
          logger.debug(`📊 [DEBUG] 美股名称映射: ${ticker} -> ${company_name}`);
          return company_name;
        } else {
          return `股票${ticker}`;
        }
      } catch (e) {
        logger.error(`❌ [DEBUG] 获取公司名称失败: ${e}`);
        return `股票${ticker}`;
      }
    };

    const company_name = _get_company_name(ticker, market_info);
    logger.info(`[新闻分析师] 公司名称: ${company_name}`);

    // 🔧 使用统一新闻工具，简化工具调用
    logger.info(`[新闻分析师] 使用统一新闻工具，自动识别股票类型并获取相应新闻`);


    const tools = [stockSearchNewsTool];
    logger.info(`[新闻分析师] 已加载统一新闻工具: get_stock_news_unified`);

    const system_message = `您是一位专业的财经新闻分析师，负责分析最新的市场新闻和事件对股票价格的潜在影响。

您的主要职责包括：
1. 获取和分析最新的实时新闻（优先15-30分钟内的新闻）
2. 评估新闻事件的紧急程度和市场影响
3. 识别可能影响股价的关键信息
4. 分析新闻的时效性和可靠性
5. 提供基于新闻的交易建议和价格影响评估

重点关注的新闻类型：
- 财报发布和业绩指导
- 重大合作和并购消息
- 政策变化和监管动态
- 突发事件和危机管理
- 行业趋势和技术突破
- 管理层变动和战略调整

分析要点：
- 新闻的时效性（发布时间距离现在多久）
- 新闻的可信度（来源权威性）
- 市场影响程度（对股价的潜在影响）
- 投资者情绪变化（正面/负面/中性）
- 与历史类似事件的对比

📊 价格影响分析要求：
- 评估新闻对股价的短期影响（1-3天）
- 分析可能的价格波动幅度（百分比）
- 提供基于新闻的价格调整建议
- 识别关键价格支撑位和阻力位
- 评估新闻对长期投资价值的影响
- 不允许回复'无法评估价格影响'或'需要更多信息'

请特别注意：
⚠️ 如果新闻数据存在滞后（超过2小时），请在分析中明确说明时效性限制
✅ 优先分析最新的、高相关性的新闻事件
📊 提供新闻对股价影响的量化评估和具体价格预期
💰 必须包含基于新闻的价格影响分析和调整建议

请撰写详细的中文分析报告，并在报告末尾附上Markdown表格总结关键发现。`;

    const toolNames = tools
      .map((tool) => {
        const typedTool = tool as { name?: string };
        return typedTool.name || 'unknown';
      })
      .join(', ');

    const prompt = [
      new SystemMessage(`您是一位专业的财经新闻分析师。"
        + "\n🚨 CRITICAL REQUIREMENT - 绝对强制要求："
        + "\n"
        + "\n❌ 禁止行为："
        + "\n- 绝对禁止在没有调用工具的情况下直接回答"
        + "\n- 绝对禁止基于推测或假设生成任何分析内容"
        + "\n- 绝对禁止跳过工具调用步骤"
        + "\n- 绝对禁止说'我无法获取实时数据'等借口"
        + "\n"
        + "\n✅ 强制执行步骤："
        + "\n1. 您的第一个动作必须是调用 get_stock_news_unified 工具"
        + "\n2. 该工具会自动识别股票类型（A股、港股、美股）并获取相应新闻"
        + "\n3. 只有在成功获取新闻数据后，才能开始分析"
        + "\n4. 您的回答必须基于工具返回的真实数据"
        + "\n"
        + "\n🔧 工具调用格式示例："
        + "\n调用: get_stock_news_unified(stock_code='${ticker}', max_news=10)"
        + "\n"
        + "\n⚠️ 如果您不调用工具，您的回答将被视为无效并被拒绝。"
        + "\n⚠️ 您必须先调用工具获取数据，然后基于数据进行分析。"
        + "\n⚠️ 没有例外，没有借口，必须调用工具。"
        + "\n"
        + "\n您可以访问以下工具：${toolNames}。"
        + "\n${system_message}"
        + "\n供您参考，当前日期是${current_date}。我们正在查看公司${ticker}。"
        + "\n请按照上述要求执行，用中文撰写所有分析内容。`),
      ...state.messages,
    ];

    const agent = createAgent({
      model: llm.bindTools(tools),
      tools: tools,
    });
    logger.info(`[新闻分析师] 开始LLM调用，分析 ${ticker} 的新闻`);
    const result = await agent.invoke({
      messages: prompt,
    });

    const messages = result.messages;
    const report = getContentAfterLastThinkTag(messages[messages.length - 1].content as string);

    const clean_message = new AIMessage({ content: report });

    logger.info(`[新闻分析师] ✅ 返回消息，报告长度: ${report.length} 字符`);

    return {
      messages: [clean_message],
      news_report: report,
    };
  }

  return news_analyst_node;
}
