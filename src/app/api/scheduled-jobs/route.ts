import { BaseController } from '@renderer/api/base/baseController';
import { ScheduledJobController } from '@server/controller/scheduledJob';

class ScheduledJobHttpController extends BaseController {
  static async GET(request: Request) {
    const controller = new ScheduledJobController();
    const query = await super.getQuery(request);
    return Response.json(await controller.listJobs(query));
  }

  static async POST(request: Request) {
    const controller = new ScheduledJobController();
    const body = await super.getBody(request);
    return Response.json(await controller.createJob(body));
  }
}

export const GET = ScheduledJobHttpController.GET;
export const POST = ScheduledJobHttpController.POST;
