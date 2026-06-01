import { BaseController } from '@renderer/api/base/baseController';
import { ScheduledJobController } from '@server/controller/scheduledJob';

class ScheduledJobDetailHttpController extends BaseController {
  static async GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const controller = new ScheduledJobController();
    const p = await params;
    return Response.json(await controller.getJobById({ id: p.id }));
  }

  static async PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const controller = new ScheduledJobController();
    const body = await super.getBody(request);
    const p = await params;
    return Response.json(await controller.updateJob({ ...body, id: p.id }));
  }

  static async DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const controller = new ScheduledJobController();
    const p = await params;
    return Response.json(await controller.deleteJob({ id: p.id }));
  }
}

export const GET = ScheduledJobDetailHttpController.GET;
export const PUT = ScheduledJobDetailHttpController.PUT;
export const DELETE = ScheduledJobDetailHttpController.DELETE;
