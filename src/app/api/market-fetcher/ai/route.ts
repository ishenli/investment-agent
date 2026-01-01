import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '@renderer/api/base/baseController';
import { MarketBizController } from '@/server/controller/market';

class MarketAIHttpController extends BaseController {
  static controller = new MarketBizController();
  
  @WithRequestContext()
  static async POST(request: Request) {
    const body = await super.getBody(request);
    return Response.json(await MarketAIHttpController.controller.summarizeContent(body));
  }

  @WithRequestContext()
  static async PUT(request: Request) {
    const body = await super.getBody(request);
    return Response.json(await MarketAIHttpController.controller.analyzeContent(body));
  }
}

export const POST = MarketAIHttpController.POST;
export const PUT = MarketAIHttpController.PUT;
