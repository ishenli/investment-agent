import { BaseController } from '@renderer/api/base/baseController';
import { AiInsightController } from '@server/controller/aiInsight';

class AiInsightDetailHttpController extends BaseController {
  static async GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const controller = new AiInsightController();
    const p = await params;
    return Response.json(await controller.getInsightById({ id: p.id }));
  }
}

export const GET = AiInsightDetailHttpController.GET;
