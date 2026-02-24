import { BaseController } from '../../base/baseController';
import { ChatController } from '@server/controller/chatController';
import {
  GetMessagesSchema,
  CreateMessageSchema,
  UpdateMessageSchema,
  DeleteMessageSchema,
} from '../schemas';
import { WithRequestContextStatic } from '@/server/base/decorators';

class MessageHttpController extends BaseController {
  @WithRequestContextStatic()
  static async GET(request: Request) {
    const chatController = new ChatController();
    const query = await super.validateParams(request, GetMessagesSchema);
    return Response.json(
      await chatController.getMessages({
        sessionId: query.sessionId,
        topicId: query.topicId,
        pageSize: query.pageSize?.toString(),
        cursor: query.cursor,
      })
    );
  }

  @WithRequestContextStatic()
  static async POST(request: Request) {
    const chatController = new ChatController();
    const body = await super.validateBody(request, CreateMessageSchema);
    return Response.json(await chatController.createMessage(body));
  }

  @WithRequestContextStatic()
  static async PUT(request: Request) {
    const chatController = new ChatController();
    const body = await super.validateBody(request, UpdateMessageSchema);
    return Response.json(await chatController.updateMessage(body));
  }

  @WithRequestContextStatic()
  static async DELETE(request: Request) {
    const chatController = new ChatController();
    const body = await super.validateBody(request, DeleteMessageSchema);
    return Response.json(await chatController.deleteMessage(body));
  }
}

// 导出对应的 HTTP 方法
export const GET = MessageHttpController.GET;
export const POST = MessageHttpController.POST;
export const PUT = MessageHttpController.PUT;
export const DELETE = MessageHttpController.DELETE;