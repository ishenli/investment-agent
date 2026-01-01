import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '@renderer/api/base/baseController';
import { MarketBizController } from '@/server/controller/market';

class MarketFetcherHttpController extends BaseController {
  static controller = new MarketBizController();
  
  @WithRequestContext()
  static async POST(request: Request) {
    const body = await super.getBody(request);
    return Response.json(await MarketFetcherHttpController.controller.crawlMarketInfo(body));
  }

  @WithRequestContext()
  static async GET(request: Request) {
    const json = await super.getQuery(request);
    return Response.json(await MarketFetcherHttpController.controller.getDataSources(json));
  }
}

export const POST = MarketFetcherHttpController.POST;
export const GET = MarketFetcherHttpController.GET;
