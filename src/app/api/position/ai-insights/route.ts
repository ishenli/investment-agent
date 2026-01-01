import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '@renderer/api/base/baseController';
import { PositionBizController } from '@/server/controller/position';

class PositionAIInsightsHttpController extends BaseController {
  static controller = new PositionBizController();
  
  @WithRequestContext()
  static async GET(request: Request) {
    const json = await super.getQuery(request);
    return Response.json(await PositionAIInsightsHttpController.controller.getAIInsights(json));
  }

  @WithRequestContext()
  static async POST(request: Request) {
    const body = await super.getBody(request);
    return Response.json(await PositionAIInsightsHttpController.controller.generateAIInsights(body));
  }
}

export const GET = PositionAIInsightsHttpController.GET;
export const POST = PositionAIInsightsHttpController.POST;
