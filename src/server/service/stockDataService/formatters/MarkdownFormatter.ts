import type { QuoteResponse } from '../../unifiedPriceService/types';
import type { MarketType } from '@typings/asset';

export interface CandleData {
  symbol: string;
  count: number;
  firstClose: number;
  lastClose: number;
  high: number;
  low: number;
  change: number;
  changePercent: number;
}

export interface CompanyProfile {
  name?: string;
  currency?: string;
  exchange?: string;
  ticker?: string;
}

export interface FormattedQuoteData {
  symbol: string;
  name?: string;
  exchange?: string;
  currency?: string;
  currentPrice?: number;
  change?: number;
  changePercent?: number;
  openPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  previousClose?: number;
  timestamp?: Date;
  source?: string;
  cached?: boolean;
}

export interface FormattedHistoryData {
  symbol: string;
  name?: string;
  exchange?: string;
  currency?: string;
  startDate?: string;
  endDate?: string;
  periodCount?: number;
  firstPrice?: number;
  lastPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  change?: number;
  changePercent?: string;
}

/**
 * Markdown 格式化器
 *
 * 将股票数据格式化为 LLM 友好的 Markdown 文本
 */
export class MarkdownFormatter {
  /**
   * 格式化实时报价数据为 Markdown
   *
   * @param quote 价格响应
   * @param market 市场类型
   * @param profile 公司档案（可选）
   * @returns Markdown 文本
   */
  formatQuote(
    quote: QuoteResponse,
    market: MarketType,
    profile?: CompanyProfile,
  ): string {
    const marketName = this.getMarketName(market);
    const companyName = profile?.name || quote.symbol.toUpperCase();
    const currency = quote.currency;

    const marketDataSection = `
// ## 📊 实时行情
// - 当前价格: ${quote.price.toFixed(2)} ${currency}
// - 更新时间: ${new Date(quote.timestamp).toLocaleString('zh-CN')}
// - 数据来源: ${quote.source}
// - 缓存状态: ${quote.cached ? '来自缓存' : '实时获取'}
`;

    const formatted = `# ${quote.symbol.toUpperCase()} 市场数据分析

// - 公司名称: ${companyName}
// - 市场: ${marketName}
// - 原币种: ${currency}
${marketDataSection}

// ## 📈 数据概览
// - 数据类型: 实时报价
// - 数据生成时间: ${new Date().toLocaleString('zh-CN')}
// `;

    return formatted;
  }

  /**
   * 格式化带有更多详情的报价数据（如 Finnhub Quote）
   *
   * @param data 格式化的报价数据
   * @param market 市场类型
   * @param profile 公司档案（可选）
   * @returns Markdown 文本
   */
  formatDetailedQuote(
    data: FormattedQuoteData,
    market: MarketType,
    profile?: CompanyProfile,
  ): string {
    const marketName = this.getMarketName(market);
    const companyName = profile?.name || data.symbol;
    const currency = profile?.currency || 'USD';

    let detailSection = '';

    if (data.currentPrice !== undefined && data.change !== undefined && data.changePercent !== undefined) {
      const changeSign = data.change >= 0 ? '+' : '';
      const changePercentSign = data.changePercent >= 0 ? '+' : '';

      detailSection = `
// ## 📊 实时行情
// - 当前价格: ${data.currentPrice.toFixed(2)} ${currency}
// - 涨跌额: ${changeSign}${data.change.toFixed(2)}
// - 涨跌幅: ${changePercentSign}${data.changePercent.toFixed(2)}%`;

      if (data.openPrice !== undefined) {
        detailSection += `\n// - 开盘价: ${data.openPrice.toFixed(2)} ${currency}`;
      }
      if (data.highPrice !== undefined) {
        detailSection += `\n// - 最高价: ${data.highPrice.toFixed(2)} ${currency}`;
      }
      if (data.lowPrice !== undefined) {
        detailSection += `\n// - 最低价: ${data.lowPrice.toFixed(2)} ${currency}`;
      }
      if (data.previousClose !== undefined) {
        detailSection += `\n// - 前收盘: ${data.previousClose.toFixed(2)} ${currency}`;
      }
      if (data.timestamp !== undefined) {
        detailSection += `\n// - 更新时间: ${new Date(data.timestamp).toLocaleString('zh-CN')}`;
      }
      if (data.source !== undefined) {
        detailSection += `\n// - 数据来源: ${data.source}`;
      }
      if (data.cached !== undefined) {
        detailSection += `\n// - 缓存状态: ${data.cached ? '来自缓存' : '实时获取'}`;
      }
    }

    const formatted = `# ${data.symbol.toUpperCase()} 市场数据分析

// - 公司名称: ${companyName}
// - 市场: ${marketName}
// - 交易所: ${profile?.exchange || data.exchange || 'N/A'}
// - 原币种: ${currency}
${detailSection}

// ## 📈 数据概览
// - 数据类型: 实时报价
// - 数据生成时间: ${new Date().toLocaleString('zh-CN')}
// `;

    return formatted;
  }

  /**
   * 格式化历史行情数据为 Markdown
   *
   * @param history 蜡烛数据
   * @param market 市场类型
   * @param profile 公司档案（可选）
   * @param startDate 开始日期（可选）
   * @param endDate 结束日期（可选）
   * @returns Markdown 文本
   */
  formatHistory(
    history: CandleData,
    market: MarketType,
    profile?: CompanyProfile,
    startDate?: string,
    endDate?: string,
  ): string {
    const marketName = this.getMarketName(market);
    const companyName = profile?.name || history.symbol.toUpperCase();
    const currency = profile?.currency || 'USD';

    const changeSign = history.change >= 0 ? '+' : '';
    const marketDataSection = `
// ## 📉 历史行情
// - 周期: ${history.count} 个交易日
// - 起始价格: ${history.firstClose.toFixed(2)} ${currency}
// - 结束价格: ${history.lastClose.toFixed(2)} ${currency}
// - 期间最高: ${history.high.toFixed(2)} ${currency}
// - 期间最低: ${history.low.toFixed(2)} ${currency}
// - 期间涨跌: ${changeSign}${history.change.toFixed(2)} (${changeSign}${history.changePercent.toFixed(2)}%)
`;

    const dateRangeText = startDate && endDate
      ? `// - 数据期间: ${startDate} 至 ${endDate}`
      : '';

    const formatted = `# ${history.symbol.toUpperCase()} 市场数据分析

// - 公司名称: ${companyName}
// - 市场: ${marketName}
// - 交易所: ${profile?.exchange || 'N/A'}
// - 原币种: ${currency}
${marketDataSection}

// ## 📈 数据概览
${dateRangeText}
// - 数据来源: Finnhub API
// - 数据生成时间: ${new Date().toLocaleString('zh-CN')}
// `;

    return formatted;
  }

  /**
   * 格式化通用历史数据对象
   *
   * @param data 历史数据
   * @param market 市场类型
   * @param profile 公司档案（可选）
   * @returns Markdown 文本
   */
  formatHistoryData(
    data: FormattedHistoryData,
    market: MarketType,
    profile?: CompanyProfile,
  ): string {
    const marketName = this.getMarketName(market);
    const companyName = profile?.name || data.symbol;
    const currency = profile?.currency || 'USD';

    let marketDataSection = '';

    if (data.periodCount && data.firstPrice && data.lastPrice) {
      const change = data.change ?? (data.lastPrice - (data.firstPrice ?? 0));
      const changePercent = data.changePercent || (data.change !== undefined
        ? ((change / data.firstPrice) * 100).toFixed(2) + '%'
        : '0.00%');
      const changeSign = change >= 0 && !changePercent.startsWith('-') ? '+' : '';

      marketDataSection = `
// ## 📉 历史行情
// - 周期: ${data.periodCount} 个交易日
// - 起始价格: ${data.firstPrice.toFixed(2)} ${currency}
// - 结束价格: ${data.lastPrice.toFixed(2)} ${currency}
// - 期间最高: ${data.highPrice?.toFixed(2) ?? 'N/A'} ${currency}
// - 期间最低: ${data.lowPrice?.toFixed(2) ?? 'N/A'} ${currency}
// - 期间涨跌: ${changeSign}${change.toFixed(2)} (${changePercent})`;
    }

    const dateRangeText = data.startDate && data.endDate
      ? `// - 数据期间: ${data.startDate} 至 ${data.endDate}`
      : '';

    const formatted = `# ${data.symbol.toUpperCase()} 市场数据分析

// - 公司名称: ${companyName}
// - 市场: ${marketName}
// - 交易所: ${profile?.exchange || data.exchange || 'N/A'}
// - 原币种: ${currency}
${marketDataSection}

// ## 📈 数据概览
${dateRangeText}
// - 数据来源: Finnhub API
// - 数据生成时间: ${new Date().toLocaleString('zh-CN')}
// `;

    return formatted;
  }

  /**
   * 格式化错误数据为 Markdown
   *
   * @param symbol 股票代码
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param errorMessage 错误信息
   * @param market 市场类型（可选）
   * @returns Markdown 文本
   */
  formatError(
    symbol: string,
    startDate: string,
    endDate: string,
    errorMessage: string,
    market?: MarketType,
  ): string {
    const marketName = market ? this.getMarketName(market) : '未指定';

    return `# ${symbol} 数据获取失败

## ❌ 错误信息
${errorMessage}

## ⚠️ 提示
- 市场: ${marketName}
- 数据期间: ${startDate} 至 ${endDate}
- 建议稍后重试或检查网络连接

生成时间: ${new Date().toLocaleString('zh-CN')}
`;
  }

  /**
   * 获取市场名称
   *
   * @param market 市场类型
   * @returns 市场名称
   */
  private getMarketName(market: MarketType): string {
    switch (market) {
      case 'US':
        return '美股';
      case 'HK':
        return '港股';
      case 'CN':
        return 'A股';
      default:
        return '未知市场';
    }
  }

  /**
   * 从公司档案创建 FormattedQuoteData（用于非 Finnhub 重播）
   */
  createFormattedQuoteDataFromProfile(
    symbol: string,
    price: number,
    profile: CompanyProfile,
    timestamp: Date,
    source: string,
    cached: boolean,
  ): FormattedQuoteData {
    return {
      symbol,
      name: profile.name,
      exchange: profile.exchange,
      currency: profile.currency,
      currentPrice: price,
      timestamp,
      source,
      cached,
    };
  }

  /**
   * 计算 CandleData 统计信息
   */
  calculateCandleData(closes: number[], highs: number[], lows: number[]): CandleData | null {
    if (!closes.length || !highs.length || !lows.length) {
      return null;
    }

    const firstClose = closes[0];
    const lastClose = closes[closes.length - 1];
    const high = Math.max(...highs);
    const low = Math.min(...lows);
    const change = lastClose - firstClose;
    const changePercent = (change / firstClose) * 100;

    return {
      symbol: '', // 由调用方设置
      count: closes.length,
      firstClose,
      lastClose,
      high,
      low,
      change,
      changePercent,
    };
  }
}