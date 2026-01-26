import type { MarketType } from '@typings/asset';
import type { QuoteRequest, QuoteResponse, BatchQuoteResponse } from '@server/service/unifiedPriceService/types';

/**
 * 价格数据源适配器抽象基类
 *
 * 每个适配器负责调用一个特定的外部数据源 API（如 Finnhub、腾讯接口等），
 * 获取资产价格并返回标准化的 QuoteResponse。
 *
 * 适配器不应该直接操作数据库，持久化由 UnifiedPriceService 通过 priceService 处理。
 */
export abstract class PriceSourceAdapter {
  /**
   * 适配器名称，用于标识和日志记录
   */
  abstract name: string;

  /**
   * 适配器支持的市场列表
   */
  abstract supportedMarkets: MarketType[];

  /**
   * 是否支持批量查询
   * 如果为 false，fetchBatchQuotes 将使用循环调用 fetchQuote 的默认实现
   */
  abstract supportsBatch: boolean;

  /**
   * 获取单个资产的价格
   *
   * @param request 价格查询请求
   * @returns 价格响应，如果查询失败则返回 null
   */
  abstract fetchQuote(request: QuoteRequest): Promise<QuoteResponse | null>;

  /**
   * 批量获取多个资产的价格
   *
   * 默认实现是循环调用 fetchQuote。如果数据源支持真正的批量查询，
   * 子类应该重写此方法以提高性能。
   *
   * @param requests 价格查询请求数组
   * @returns 批量价格响应
   */
  async fetchBatchQuotes(requests: QuoteRequest[]): Promise<BatchQuoteResponse> {
    const succeeded: QuoteResponse[] = [];
    const failed: Array<{ symbol: string; market: MarketType; error: string }> = [];

    // 并行处理所有请求（性能优化）
    const promises = requests.map(async (request) => {
      try {
        const result = await this.fetchQuote(request);
        if (result) {
          succeeded.push(result);
        } else {
          failed.push({
            symbol: request.symbol,
            market: request.market,
            error: 'No price data returned',
          });
        }
      } catch (error) {
        failed.push({
          symbol: request.symbol,
          market: request.market,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    await Promise.all(promises);

    return { succeeded, failed };
  }

  /**
   * 健康检查，验证适配器的数据源是否可用
   *
   * @returns 数据源是否可用
   */
  abstract healthCheck(): Promise<boolean>;

  /**
   * 检查是否支持指定的市场
   *
   * @param market 市场类型
   * @returns 是否支持该市场
   */
  supportsMarket(market: MarketType): boolean {
    return this.supportedMarkets.includes(market);
  }
}