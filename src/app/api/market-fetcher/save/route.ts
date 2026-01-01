import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '@renderer/api/base/baseController';
import { MarketBizController } from '@/server/controller/market';

class MarketFetcherSaveHttpController extends BaseController {
  static controller = new MarketBizController();
  
  @WithRequestContext()
  static async POST(request: Request) {
    const body = await super.getBody(request);
    return Response.json(await MarketFetcherSaveHttpController.controller.saveMarketInfo(body));
  }
}

export const POST = MarketFetcherSaveHttpController.POST;
