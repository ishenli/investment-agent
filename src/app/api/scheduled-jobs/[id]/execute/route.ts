import { BaseController } from '@renderer/api/base/baseController';
import { ScheduledJobController } from '@server/controller/scheduledJob';

class ScheduledJobExecuteHttpController extends BaseController {
  static async POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const controller = new ScheduledJobController();
    const p = await params;
    return Response.json(await controller.executeJob({ id: p.id }, request));
  }
}

export const POST = ScheduledJobExecuteHttpController.POST;
