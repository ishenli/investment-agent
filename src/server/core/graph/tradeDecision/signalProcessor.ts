import { HumanMessage, SystemMessage } from 'langchain';
import { ChatOpenAI } from '@langchain/openai';
import { StockUtils } from '../../utils/stockUtils/index';
import { JsonExtractor } from '@/shared';
import { Logger } from '@server/base/logger';

type DecisionDataType = {
  action: string;
  target_price: number;
  confidence: string;
  risk_score: string;
  reasoning: string;
};

type DecisionResultType = {
  action: string;
  target_price: number | null;
  confidence: number;
  risk_score: number;
  reasoning: string;
};

export class SignalProcessor {
  quick_thinking_llm: ChatOpenAI;
  logger: Logger;
  constructor(quick_thinking_llm: ChatOpenAI, logger: Logger) {
    this.quick_thinking_llm = quick_thinking_llm;
    this.logger = logger;
  }

  async process_signal(full_signal: string | object, stock_symbol: string) {
    const market_info = StockUtils.getMarketInfo(stock_symbol);
    const is_china = market_info['is_china'];
    const is_hk = market_info['is_hk'];
    const currency = market_info['currency_name'];
    const currency_symbol = market_info['currency_symbol'];

    this.logger.info(
      `🔍 [SignalProcessor] 处理信号: 股票=${stock_symbol}, 市场=${market_info['market_name']}, 货币=${currency}`,
    );

    const messages = [
      new SystemMessage(`
您是一位专业的金融分析助手，负责从交易员的分析报告中提取结构化的投资决策信息。

请从提供的分析报告中提取以下信息，并以JSON格式返回：

{{
    "action": "买入/持有/卖出",
    "target_price": 数字(${currency}价格，**必须提供具体数值，不能为null**),
    "confidence": 数字(0-1之间，如果没有明确提及则为0.7),
    "risk_score": 数字(0-1之间，如果没有明确提及则为0.5),
    "reasoning": "决策的主要理由摘要"
}}

请确保：
1. action字段必须是"买入"、"持有"或"卖出"之一（绝对不允许使用英文buy/hold/sell）
2. target_price必须是具体的数字,target_price应该是合理的${currency}价格数字（使用${currency_symbol}符号）
3. confidence和risk_score应该在0-1之间
4. reasoning应该是简洁的中文摘要
5. 所有内容必须使用中文，不允许任何英文投资建议

特别注意：
- 股票代码 ${stock_symbol || '未知'} 是${market_info['market_name']}，使用${currency}计价
- 目标价格必须与股票的交易货币一致（${currency_symbol}）

如果某些信息在报告中没有明确提及，请使用合理的默认值。`),
      new HumanMessage(full_signal),
    ];

    try {
      const response = await this.quick_thinking_llm.invoke(messages);
      const JSONData = JsonExtractor.extract(response.content as string);
      if (!JSONData.success) {
        throw new Error(`Invalid JSON: ${JSONData.error}`);
      }

      const decisionData = JSONData.data as DecisionDataType;
      let action = decisionData['action'] || '持有';
      if (!['买入', '持有', '卖出'].includes(action)) {
        // # 尝试映射英文和其他变体
        const action_map: { [key: string]: string } = {
          buy: '买入',
          hold: '持有',
          sell: '卖出',
          BUY: '买入',
          HOLD: '持有',
          SELL: '卖出',
          购买: '买入',
          保持: '持有',
          出售: '卖出',
          purchase: '买入',
          keep: '持有',
          dispose: '卖出',
        };
        action = action_map[action] || '持有';
        if (action !== decisionData['action']) {
          this.logger.debug(
            `🔍 [SignalProcessor] 投资建议映射: ${decisionData['action']} -> ${action}`,
          );
        }
      }

      const target_price = decisionData['target_price'];

      return {
        action: action,
        target_price: target_price,
        confidence: parseFloat(decisionData['confidence'] || '0.7'),
        risk_score: parseFloat(decisionData['risk_score'] || '0.5'),
        reasoning: decisionData['reasoning'] || '基于综合分析的投资建议',
      };
    } catch (error) {
      this.logger.error(`[SignalProcessor] 处理信号时出错: ${error}`);
      throw error;
    } finally {
      this.logger.info(`[SignalProcessor] 信号处理完成: ${stock_symbol}`);
    }
  }

  /**
   * 简单的决策提取方法作为备用
   * @param text - 要分析的文本
   * @returns 决策结果对象
   */
  private _extract_simple_decision(text: string): DecisionResultType {
    // 提取动作
    let action: string = '持有'; // 默认
    if (/(买入|BUY)/i.test(text)) {
      action = '买入';
    } else if (/(卖出|SELL)/i.test(text)) {
      action = '卖出';
    } else if (/(持有|HOLD)/i.test(text)) {
      action = '持有';
    }

    // 尝试提取目标价格（使用增强的模式）
    let target_price: number | null = null;
    const price_patterns: RegExp[] = [
      /目标价[位格]?[：:]?\s*[¥\$]?(\d+(?:\.\d+)?)/, // 目标价位: 45.50
      /\*\*目标价[位格]?\*\*[：:]?\s*[¥\$]?(\d+(?:\.\d+)?)/, // **目标价位**: 45.50
      /目标[：:]?\s*[¥\$]?(\d+(?:\.\d+)?)/, // 目标: 45.50
      /价格[：:]?\s*[¥\$]?(\d+(?:\.\d+)?)/, // 价格: 45.50
      /[¥\$](\d+(?:\.\d+)?)/, // ¥45.50 或 $190
      /(\d+(?:\.\d+)?)元/, // 45.50元
    ];

    for (const pattern of price_patterns) {
      const price_match = text.match(pattern);
      if (price_match && price_match[1]) {
        try {
          target_price = parseFloat(price_match[1]);
          break;
        } catch (e) {
          continue;
        }
      }
    }

    // 如果没有找到价格，尝试智能推算
    if (target_price === null) {
      // 检测股票类型
      const is_china: boolean = true; // 默认假设是A股，实际应该从上下文获取
      target_price = this._smart_price_estimation(text, action, is_china);
    }

    return {
      action: action,
      target_price: target_price,
      confidence: 0.7,
      risk_score: 0.5,
      reasoning: '基于综合分析的投资建议',
    };
  }
  /**
   * 智能价格推算方法
   * @param text - 要分析的文本
   * @param action - 投资动作（买入/卖出/持有）
   * @param is_china - 是否为A股市场
   * @returns 推算的目标价格，如果无法推算则返回 null
   */
  private _smart_price_estimation(text: string, action: string, is_china: boolean): number | null {
    // 尝试从文本中提取当前价格和涨跌幅信息
    let current_price: number | null = null;
    let percentage_change: number | null = null;

    // 提取当前价格
    const current_price_patterns: RegExp[] = [
      /当前价[格位]?[：:]?\s*[¥\$]?(\d+(?:\.\d+)?)/,
      /现价[：:]?\s*[¥\$]?(\d+(?:\.\d+)?)/,
      /股价[：:]?\s*[¥\$]?(\d+(?:\.\d+)?)/,
      /价格[：:]?\s*[¥\$]?(\d+(?:\.\d+)?)/,
    ];

    for (const pattern of current_price_patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        try {
          current_price = parseFloat(match[1]);
          break;
        } catch (e) {
          continue;
        }
      }
    }

    // 提取涨跌幅信息
    const percentage_patterns: RegExp[] = [
      /上涨\s*(\d+(?:\.\d+)?)%/,
      /涨幅\s*(\d+(?:\.\d+)?)%/,
      /增长\s*(\d+(?:\.\d+)?)%/,
      /(\d+(?:\.\d+)?)%\s*的?上涨/,
    ];

    for (const pattern of percentage_patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        try {
          percentage_change = parseFloat(match[1]) / 100;
          break;
        } catch (e) {
          continue;
        }
      }
    }

    // 基于动作和信息推算目标价
    if (current_price && percentage_change) {
      if (action === '买入') {
        return Math.round(current_price * (1 + percentage_change) * 100) / 100;
      } else if (action === '卖出') {
        return Math.round(current_price * (1 - percentage_change) * 100) / 100;
      }
    }

    // 如果有当前价格但没有涨跌幅，使用默认估算
    if (current_price) {
      if (action === '买入') {
        // 买入建议默认10-20%涨幅
        const multiplier = is_china ? 1.15 : 1.12;
        return Math.round(current_price * multiplier * 100) / 100;
      } else if (action === '卖出') {
        // 卖出建议默认5-10%跌幅
        const multiplier = is_china ? 0.95 : 0.92;
        return Math.round(current_price * multiplier * 100) / 100;
      } else {
        // 持有
        // 持有建议使用当前价格
        return current_price;
      }
    }

    return null;
  }

  get_default_decision() {
    return {
      action: '持有',
      target_price: null,
      confidence: 0.5,
      risk_score: 0.5,
      reasoning: '输入数据无效，默认持有建议',
    };
  }
}
