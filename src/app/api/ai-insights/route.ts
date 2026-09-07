import { BaseController } from '@renderer/api/base/baseController';
import { AiInsightController } from '@server/controller/aiInsight';

class AiInsightHttpController extends BaseController {
  static async GET(request: Request) {
    const controller = new AiInsightController();
    const query = await super.getQuery(request);
    return Response.json(await controller.listInsights(query));
  }

  static async DELETE() {
    const controller = new AiInsightController();
    return Response.json(await controller.cleanScheduledInsights());
  }
}

export const GET = AiInsightHttpController.GET;
export const DELETE = AiInsightHttpController.DELETE;
