import { BaseController } from '../../base/baseController';
import { ObservabilityBizController } from '@server/controller/observability';

class ObservabilityDetailHttpController extends BaseController {
  static async GET(
    request: Request,
    { params }: { params: Promise<{ traceId: string }> }
  ) {
    const controller = new ObservabilityBizController();
    const { traceId } = await params;
    return Response.json(await controller.getTraceDetail({ traceId }));
  }
}

export const GET = ObservabilityDetailHttpController.GET;
