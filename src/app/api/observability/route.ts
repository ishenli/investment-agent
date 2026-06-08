import { BaseController } from '../base/baseController';
import { ObservabilityBizController } from '@server/controller/observability';

class ObservabilityHttpController extends BaseController {
  static async GET(request: Request) {
    const controller = new ObservabilityBizController();
    const query = await super.getQuery(request);
    return Response.json(await controller.getTraces(query));
  }
}

export const GET = ObservabilityHttpController.GET;
