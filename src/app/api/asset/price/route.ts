import { WithRequestContextStatic } from '@server/base/decorators';
import { BaseController } from '@renderer/api/base/baseController';
import priceService from '@server/service/priceService';
import finnhubService from '@server/service/finnhubService';
import logger from '@server/base/logger';
import { MarketType } from '@typings/asset';

class AssetPriceController extends BaseController {
  /**
   * 获取单个资产的最新价格
   * @param request HTTP请求对象
   * @param params 路由参数
   * @returns 资产价格信息
   */
  @WithRequestContextStatic()
  static async GET(request: Request) {
    try {
      const params = new URL(request.url).searchParams;
      const symbol = params.get('symbol');

      if (!symbol) {
        return this.error('资产代码不能为空', 'missing_symbol');
      }

      const price = await priceService.getLatestPrice(symbol);

      if (!price) {
        return this.error('未找到该资产的价格信息', 'price_not_found');
      }

      return this.success({
        message: '获取资产价格成功',
        data: price,
      });
    } catch (error) {
      logger.error(`[AssetPriceController] 获取资产价格失败: ${error}`);
      return this.error('获取资产价格失败', 'get_price_error');
    }
  }

  /**
   * 批量获取多个资产的最新价格
   * @param request HTTP请求对象
   * @returns 资产价格信息
   */
  @WithRequestContextStatic()
  static async POST(request: Request) {
    try {
      const body = await request.json();
      const { symbols } = body as { symbols: string[] };

      if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
        return this.error('请提供有效的资产代码列表', 'invalid_symbols');
      }

      const prices = await priceService.getLatestPrices(symbols);

      return this.success({
        message: '批量获取资产价格成功',
        data: prices,
      });
    } catch (error) {
      logger.error(`[AssetPriceController] 批量获取资产价格失败: ${error}`);
      return this.error('批量获取资产价格失败', 'batch_get_price_error');
    }
  }

  /**
   * 通过AllTick API获取资产的最新价格
   * @param request HTTP请求对象
   * @returns 资产价格信息
   */
  @WithRequestContextStatic()
  static async PUT(request: Request) {
    try {
      const body = await request.json();
      const { symbol, market } = body as { symbol: string; market: MarketType };

      if (!symbol) {
        return this.error('资产代码不能为空', 'missing_symbol');
      }

      const result = await finnhubService.batchQuoteByTencent([
        { symbol },
      ]);

      if (!result || result.length === 0) {
        return this.error('无法获取资产价格', 'price_not_found');
      }

      const priceData = result[0];

      return this.success({
        message: '获取资产价格成功',
        data: priceData,
      });
    } catch (error) {
      logger.error(`[AssetPriceController] 通过AllTick API获取资产价格失败: ${error}`);
      return this.error('获取资产价格失败', 'get_price_error');
    }
  }
}

export const GET = AssetPriceController.GET;
export const POST = AssetPriceController.POST;
export const PUT = AssetPriceController.PUT;
