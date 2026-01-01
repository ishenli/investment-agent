import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '@renderer/api/base/baseController';
import { PositionBizController } from '@/server/controller/position';

class PositionRiskInsightsHttpController extends BaseController {
  static controller = new PositionBizController();
  
  @WithRequestContext()
  static async GET(request: Request) {
    const json = await super.getQuery(request);
    return Response.json(await PositionRiskInsightsHttpController.controller.getRiskInsights(json));
  }
}

export const GET = PositionRiskInsightsHttpController.GET;
