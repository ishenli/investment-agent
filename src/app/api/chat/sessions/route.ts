import { BaseController } from '../../base/baseController';
import { ChatController } from '@server/controller/chatController';
import {
  CreateSessionSchema,
  UpdateSessionSchema,
  DeleteSessionSchema,
} from '@typings/chat/schemas';
import { WithRequestContextStatic } from '@/server/base/decorators';

class SessionHttpController extends BaseController {
  @WithRequestContextStatic()
  static async GET(request: Request) {
    const chatController = new ChatController();
    const query = await super.getQuery(request);

    // 如果有 id 参数，获取单个会话
    if (query.id) {
      return Response.json(await chatController.getSession({ id: query.id }));
    }

    // 否则获取所有会话
    return Response.json(await chatController.getSessions());
  }

  @WithRequestContextStatic()
  static async POST(request: Request) {
    const chatController = new ChatController();
    const body = await super.validateBody(request, CreateSessionSchema);
    return Response.json(await chatController.createSession(body));
  }

  @WithRequestContextStatic()
  static async PUT(request: Request) {
    const chatController = new ChatController();
    const body = await super.validateBody(request, UpdateSessionSchema);
    return Response.json(await chatController.updateSession(body));
  }

  @WithRequestContextStatic()
  static async DELETE(request: Request) {
    const chatController = new ChatController();
    const body = await super.validateBody(request, DeleteSessionSchema);
    return Response.json(await chatController.deleteSession(body));
  }
}

// 导出对应的 HTTP 方法
export const GET = SessionHttpController.GET;
export const POST = SessionHttpController.POST;
export const PUT = SessionHttpController.PUT;
export const DELETE = SessionHttpController.DELETE;