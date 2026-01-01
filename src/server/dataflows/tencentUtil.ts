import axios from 'axios';
import logger from '../base/logger';

/**
 * 腾讯港股行情数据接口
 * url = "http://sqt.gtimg.cn/utf8/q=r_hk00981"
 * url 参数改动: 股票代码 q=r_hk00981
 */

/**
 * 腾讯港股行情数据结构
 */
export interface TencentHKStockData {
  lotSize: number;                 // 每手数量
  name: string;                    // 股票名称
  price: number;                   // now price, 股票当前价格
  lastPrice: number;               // pre_close, 股票昨天收盘价格
  openPrice: number;               // 股票今天开盘价格
  amount: number;                  // volume, 股票成交量
  now_1: number;                   // 当前价格1
  now_2: number;                   // 当前价格2
  volume_2: number;                // 成交量2
  date: string;                    // 当前日期
  time: string;                    // 当前时间
  Pchange: number;                 // 涨跌, Price change
  dtd: number;                     // PCR, 涨跌(%), Price Change Ratio
  high: number;                    // 当天最高价格
  low: number;                     // 当天最低价格
  now_3: number;                   // 当前价格3
  volume_3: number;                // 成交量3
  amountYuan: number;              // true amount, 成交额
  Amp: number;                     // 振幅
  FFMCap: number;                  // 流通市值, Free Float MarketCap
  MarketCap: number;               // 总市值, Market Capacity
  year_high: number;               // 52周最高价
  year_low: number;                // 52周最低价
  ODR: number;                     // 委比, Order Difference Ratio --> (委买-委卖)*100/(委买+委卖)
  turnover: number;                // 换手率(%)
  lotSize_2: number;               // lotSize_2
  FF: number;                      // 流通股本, Free Float
  TE: number;                      // 总股本, Total Equity
  MA: number;                      // 均价, Moving Average
}

/**
 * 腾讯港股行情数据获取类
 */
export class TencentHKQuote {
  private readonly stockApi: string = "http://sqt.gtimg.cn/utf8/q=";

  /**
   * 生成股票代码前缀
   * @param stockCodes 股票代码数组
   * @returns 带前缀的股票代码数组
   */
  private genStockPrefix(stockCodes: string[]): string[] {
    return stockCodes.map(code => `r_hk${code}`);
  }

  /**
   * 格式化响应数据
   * @param repData 响应数据
   * @returns 股票数据字典
   */
  private formatResponseData(repData: string[]): Record<string, TencentHKStockData> {
    const stocksDetail = repData.join("");
    const stockDict: Record<string, TencentHKStockData> = {};

    // 使用正则表达式匹配股票数据
    const rawQuotations = stocksDetail.match(/v_r_hk\d+=".*?"/g) || [];

    for (const rawQuotation of rawQuotations) {
      const match = rawQuotation.match(/"(.*?)"/);
      if (match) {
        const quotation = match[1].split("~");
        const stockCode = quotation[2];

        stockDict[stockCode] = {
          lotSize: parseFloat(quotation[0]) || 0,                  // 每手数量
          name: quotation[1],                                      // 股票名称
          price: parseFloat(quotation[3]) || 0,                   // now price, 股票当前价格
          lastPrice: parseFloat(quotation[4]) || 0,               // pre_close, 股票昨天收盘价格
          openPrice: parseFloat(quotation[5]) || 0,               // 股票今天开盘价格
          amount: parseFloat(quotation[6]) || 0,                  // volume, 股票成交量
          now_1: parseFloat(quotation[9]) || 0,                   // 当前价格1
          now_2: parseFloat(quotation[19]) || 0,                  // 当前价格2
          volume_2: parseFloat(quotation[29]) || 0,               // 成交量2
          date: (quotation[30].substring(0, 10)).replace(/\//g, "-"),  // 当前日期
          time: quotation[30].substring(quotation[30].length - 8),     // 当前时间
          Pchange: parseFloat(quotation[31]) || 0,                // 涨跌, Price change
          dtd: parseFloat(quotation[32]) || 0,                    // PCR, 涨跌(%), Price Change Ratio
          high: parseFloat(quotation[33]) || 0,                   // 当天最高价格
          low: parseFloat(quotation[34]) || 0,                    // 当天最低价格
          now_3: parseFloat(quotation[35]) || 0,                  // 当前价格3
          volume_3: parseFloat(quotation[36]) || 0,               // 成交量3
          amountYuan: parseFloat(quotation[37]) || 0,             // true amount, 成交额
          Amp: parseFloat(quotation[43]) || 0,                    // 振幅
          FFMCap: parseFloat(quotation[44]) || 0,                 // 流通市值, Free Float MarketCap
          MarketCap: parseFloat(quotation[45]) || 0,              // 总市值, Market Capacity
          year_high: parseFloat(quotation[48]) || 0,              // 52周最高价
          year_low: parseFloat(quotation[49]) || 0,               // 52周最低价
          ODR: parseFloat(quotation[51]) || 0,                    // 委比, Order Difference Ratio
          turnover: parseFloat(quotation[59]) || 0,               // 换手率(%)
          lotSize_2: parseFloat(quotation[60]) || 0,              // lotSize_2
          FF: parseFloat(quotation[69]) || 0,                     // 流通股本, Free Float
          TE: parseFloat(quotation[70]) || 0,                     // 总股本, Total Equity
          MA: parseFloat(quotation[73]) || 0,                     // 均价, Moving Average
        };
      }
    }

    return stockDict;
  }

  /**
   * 获取港股行情数据
   * @param stockCodes 股票代码数组
   * @returns 股票数据字典
   */
  async getStockData(stockCodes: string[]): Promise<Record<string, TencentHKStockData>> {
    try {
      const prefixedCodes = this.genStockPrefix(stockCodes);
      const urls = prefixedCodes.map(code => `${this.stockApi}${code}`);
      
      // 并行请求所有股票数据
      const responses = await Promise.all(
        urls.map(url => axios.get(url, { responseType: 'text' }))
      );

      // 处理响应数据
      const repData = responses.map(response => response.data);
      return this.formatResponseData(repData);
    } catch (error) {
      logger.error("获取腾讯港股行情数据失败:", error);
      return {};
    }
  }
}
