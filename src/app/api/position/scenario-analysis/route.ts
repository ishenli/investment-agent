import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '@renderer/api/base/baseController';
import { PositionBizController } from '@/server/controller/position';

class ScenarioAnalysisHttpController extends BaseController {
  static controller = new PositionBizController();
  
  @WithRequestContext()
  static async POST(request: Request) {
    const body = await super.getBody(request);
    return Response.json(await ScenarioAnalysisHttpController.controller.analyzeScenario(body));
  }
}

export const POST = ScenarioAnalysisHttpController.POST;
