/**
 * 股票工具函数
 * 提供股票代码识别、分类和处理功能
 */

import { StockMarket } from '@/types';

export interface MarketInfo {
  ticker: string;
  market: string;
  market_name: string;
  currency_name: string;
  currency_symbol: string;
  data_source: string;
  is_china: boolean;
  is_hk: boolean;
  is_us: boolean;
}

export interface CurrencyInfo {
  name: string;
  symbol: string;
}

export class StockUtils {
  /**
   * 识别股票代码所属市场
   * @param ticker 股票代码
   * @returns 股票市场类型
   */
  static identifyStockMarket(ticker: string): StockMarket {
    if (!ticker) {
      return StockMarket.UNKNOWN;
    }

    ticker = ticker.toString().trim().toUpperCase();

    // 中国A股：6位数字
    if (/^\d{6}$/.test(ticker)) {
      return StockMarket.CHINA_A;
    }

    // 港股：4-5位数字.HK（支持0700.HK和09988.HK格式）
    if (/^\d{4,5}\.HK$/.test(ticker)) {
      return StockMarket.HONG_KONG;
    }

    // 美股：1-5位字母
    if (/^[A-Z]{1,5}$/.test(ticker)) {
      return StockMarket.US;
    }

    return StockMarket.UNKNOWN;
  }

  /**
   * 判断是否为中国A股
   * @param ticker 股票代码
   * @returns 是否为中国A股
   */
  static isChinaStock(ticker: string): boolean {
    return StockUtils.identifyStockMarket(ticker) === StockMarket.CHINA_A;
  }

  /**
   * 判断是否为港股
   * @param ticker 股票代码
   * @returns 是否为港股
   */
  static isHkStock(ticker: string): boolean {
    return StockUtils.identifyStockMarket(ticker) === StockMarket.HONG_KONG;
  }

  /**
   * 判断是否为美股
   * @param ticker 股票代码
   * @returns 是否为美股
   */
  static isUsStock(ticker: string): boolean {
    return StockUtils.identifyStockMarket(ticker) === StockMarket.US;
  }

  /**
   * 根据股票代码获取货币信息
   * @param ticker 股票代码
   * @returns [货币名称, 货币符号]
   */
  static getCurrencyInfo(ticker: string): CurrencyInfo {
    const market = StockUtils.identifyStockMarket(ticker);

    switch (market) {
      case StockMarket.CHINA_A:
        return { name: '人民币', symbol: '¥' };
      case StockMarket.HONG_KONG:
        return { name: '港币', symbol: 'HK$' };
      case StockMarket.US:
        return { name: '美元', symbol: '$' };
      default:
        return { name: '未知', symbol: '?' };
    }
  }

  /**
   * 根据股票代码获取推荐的数据源
   * @param ticker 股票代码
   * @returns 数据源名称
   */
  static getDataSource(ticker: string): string {
    const market = StockUtils.identifyStockMarket(ticker);

    switch (market) {
      case StockMarket.CHINA_A:
        return 'china_unified'; // 使用统一的中国股票数据源
      case StockMarket.HONG_KONG:
        return 'yahoo_finance'; // 港股使用Yahoo Finance
      case StockMarket.US:
        return 'yahoo_finance'; // 美股使用Yahoo Finance
      default:
        return 'unknown';
    }
  }

  /**
   * 标准化港股代码格式
   * @param ticker 原始港股代码
   * @returns 标准化后的港股代码
   */
  static normalizeHkTicker(ticker: string): string {
    if (!ticker) {
      return ticker;
    }

    ticker = ticker.toString().trim().toUpperCase();

    // 如果是纯4-5位数字，添加.HK后缀
    if (/^\d{4,5}$/.test(ticker)) {
      return `${ticker}.HK`;
    }

    // 如果已经是正确格式，直接返回
    if (/^\d{4,5}\.HK$/.test(ticker)) {
      return ticker;
    }

    return ticker;
  }

  /**
   * 获取股票市场的详细信息
   * @param ticker 股票代码
   * @returns 市场信息对象
   */
  static getMarketInfo(ticker: string): MarketInfo {
    const market = StockUtils.identifyStockMarket(ticker);
    const currencyInfo = StockUtils.getCurrencyInfo(ticker);
    const dataSource = StockUtils.getDataSource(ticker);

    const marketNames: Record<StockMarket, string> = {
      [StockMarket.CHINA_A]: '中国A股',
      [StockMarket.HONG_KONG]: '港股',
      [StockMarket.US]: '美股',
      [StockMarket.UNKNOWN]: '未知市场',
    };

    return {
      ticker: ticker,
      market: market,
      market_name: marketNames[market],
      currency_name: currencyInfo.name,
      currency_symbol: currencyInfo.symbol,
      data_source: dataSource,
      is_china: market === StockMarket.CHINA_A,
      is_hk: market === StockMarket.HONG_KONG,
      is_us: market === StockMarket.US,
    };
  }

  static async getCompanyInfo(ticker: string, marketInfo: MarketInfo) {
    try {
      if (marketInfo.is_china) {
        // 中国A股：使用统一接口获取股票信息
        const stockInfo = await getChinaStockInfoUnified(ticker);

        // 解析股票名称
        if (stockInfo.includes('股票名称:')) {
          const companyName = stockInfo.split('股票名称:')[1].split('\n')[0].trim();
          return companyName;
        } else {
          return `股票代码${ticker}`;
        }
      } else if (marketInfo.is_hk) {
        // 港股：使用改进的港股工具
        try {
          const companyName = await getHkCompanyNameImproved(ticker);
          return companyName;
        } catch (e) {
          // 降级方案：生成友好的默认名称
          const cleanTicker = ticker.replace('.HK', '').replace('.hk', '');
          return `港股${cleanTicker}`;
        }
      } else if (marketInfo.is_us) {
        // 美股：使用简单映射或返回代码
        const companyName = usStockNames[ticker.toUpperCase()] || `美股${ticker}`;
        return companyName;
      } else {
        return `股票${ticker}`;
      }
    } catch (e) {
      return `股票${ticker}`;
    }
  }
}

/**
 * 模拟获取中国A股公司信息的函数
 * @param ticker 股票代码
 * @returns 股票信息字符串
 */
async function getChinaStockInfoUnified(ticker: string): Promise<string> {
  // 模拟API调用延迟
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 模拟一些公司名称映射
  const companyNames: Record<string, string> = {
    '000001': '平安银行',
    '000002': '万科A',
    '600000': '浦发银行',
    '600036': '招商银行',
    '601318': '中国平安',
  };

  const companyName = companyNames[ticker];
  if (companyName) {
    return `股票名称:${companyName}\n股票代码:${ticker}`;
  } else {
    return `股票代码:${ticker}`;
  }
}

/**
 * 获取港股公司名称的函数
 * @param ticker 股票代码
 * @returns 公司名称
 */
async function getHkCompanyNameImproved(ticker: string): Promise<string> {
  // 模拟API调用延迟
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 模拟一些公司名称映射
  const companyNames: Record<string, string> = {
    '0700.HK': '腾讯控股',
    '09988.HK': '阿里巴巴',
    '00005.HK': '汇丰控股',
    '00012.HK': '恒基地产',
  };

  return companyNames[ticker] || `港股${ticker.replace('.HK', '').replace('.hk', '')}`;
}

// 美股公司名称映射
const usStockNames: Record<string, string> = {
  AAPL: '苹果公司',
  TSLA: '特斯拉',
  NVDA: '英伟达',
  MSFT: '微软',
  GOOGL: '谷歌',
  AMZN: '亚马逊',
  META: 'Meta',
  NFLX: '奈飞',
};

// 便捷函数，保持向后兼容
export function isChinaStock(ticker: string): boolean {
  return StockUtils.isChinaStock(ticker);
}

export function isHkStock(ticker: string): boolean {
  return StockUtils.isHkStock(ticker);
}

export function isUsStock(ticker: string): boolean {
  return StockUtils.isUsStock(ticker);
}

export function getStockMarketInfo(ticker: string): MarketInfo {
  return StockUtils.getMarketInfo(ticker);
}
