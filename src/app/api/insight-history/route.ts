import { BaseController } from '@renderer/api/base/baseController';
import { AiInsightController } from '@server/controller/aiInsight';

class InsightHistoryHttpController extends BaseController {
  static async GET(request: Request) {
    const controller = new AiInsightController();
    const query = await super.getQuery(request);
    return Response.json(await controller.listInsightHistory(query));
  }
}

export const GET = InsightHistoryHttpController.GET;