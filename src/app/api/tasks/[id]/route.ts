import { BaseController } from '@renderer/api/base/baseController';
import { TaskController } from '@server/controller/taskController';

class TaskDetailHttpController extends BaseController {
  static async GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const taskController = new TaskController();
    const p = await params;
    return Response.json(await taskController.getTaskById({ id: p.id }));
  }

  static async PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const taskController = new TaskController();
    const body = await super.getBody(request);
    const p = await params;
    const updateData = { ...body, id: p.id };
    return Response.json(await taskController.updateTask(updateData));
  }

  static async DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const taskController = new TaskController();
    const p = await params;
    return Response.json(await taskController.deleteTask({ id: p.id }));
  }
}

export const GET = TaskDetailHttpController.GET;
export const PUT = TaskDetailHttpController.PUT;
export const DELETE = TaskDetailHttpController.DELETE;
