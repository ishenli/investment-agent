import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '@renderer/api/base/baseController';
import { MarketBizController } from '@/server/controller/market';

class AssetMarketInfoListHttpController extends BaseController {
  static controller = new MarketBizController();
  
  @WithRequestContext()
  static async GET(request: Request) {
    const json = await super.getQuery(request);
    return Response.json(await AssetMarketInfoListHttpController.controller.getAssetMarketInfoList(json));
  }
}

export const GET = AssetMarketInfoListHttpController.GET;
