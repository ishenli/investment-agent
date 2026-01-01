import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '@renderer/api/base/baseController';
import { PositionBizController } from '@/server/controller/position';

class DiversificationRecommendationsHttpController extends BaseController {
  static controller = new PositionBizController();
  
  @WithRequestContext()
  static async GET(request: Request) {
    const json = await super.getQuery(request);
    return Response.json(await DiversificationRecommendationsHttpController.controller.getDiversificationRecommendations(json));
  }

  @WithRequestContext()
  static async POST(request: Request) {
    const body = await super.getBody(request);
    return Response.json(await DiversificationRecommendationsHttpController.controller.generateDiversificationRecommendations(body));
  }
}

export const GET = DiversificationRecommendationsHttpController.GET;
export const POST = DiversificationRecommendationsHttpController.POST;
