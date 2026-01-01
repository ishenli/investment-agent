import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '@renderer/api/base/baseController';
import logger from '@server/base/logger';
import { MarketBizController } from '@server/controller/market';

class AssetMarketInfosController extends BaseController {
  @WithRequestContext()
  static async GET(request: Request) {
    // 解析查询参数
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams);

    const marketController = new MarketBizController();
    return Response.json(await marketController.getMarketInfoList(searchParams));
  }

  @WithRequestContext()
  static async DELETE(request: Request) {
    // 解析查询参数
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams);
    const marketController = new MarketBizController();
    return Response.json(await marketController.deleteMarketInfo({
      id: searchParams.id
    }));
  }
}

export const GET = AssetMarketInfosController.GET;
export const DELETE = AssetMarketInfosController.DELETE;
