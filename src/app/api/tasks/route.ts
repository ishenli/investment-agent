import { BaseController } from '../base/baseController';
import { TaskController } from '@server/controller/taskController';

class TaskHttpController extends BaseController {
  static async GET(request: Request) {
    const taskController = new TaskController();
    const json = await super.getQuery(request);
    return Response.json(await taskController.listTasks(json));
  }

  static async POST(request: Request) {
    const taskController = new TaskController();
    const body = await super.getBody(request);
    return Response.json(await taskController.createTask(body));
  }
}

export const GET = TaskHttpController.GET;
export const POST = TaskHttpController.POST;
