import { BaseController } from '../../base/baseController';
import { ChatController } from '@server/controller/chatController';
import {
  GetTopicsSchema,
  CreateTopicSchema,
  UpdateTopicSchema,
  DeleteTopicSchema,
} from '../schemas';
import { WithRequestContextStatic } from '@/server/base/decorators';

class TopicHttpController extends BaseController {
  @WithRequestContextStatic()
  static async GET(request: Request) {
    const chatController = new ChatController();
    const query = await super.validateParams(request, GetTopicsSchema);
    return Response.json(await chatController.getTopics({ sessionId: query.sessionId }));
  }

  @WithRequestContextStatic()
  static async POST(request: Request) {
    const chatController = new ChatController();
    const body = await super.validateBody(request, CreateTopicSchema);
    return Response.json(await chatController.createTopic(body));
  }

  @WithRequestContextStatic()
  static async PUT(request: Request) {
    const chatController = new ChatController();
    const body = await super.validateBody(request, UpdateTopicSchema);
    return Response.json(await chatController.updateTopic(body));
  }

  @WithRequestContextStatic()
  static async DELETE(request: Request) {
    const chatController = new ChatController();
    const body = await super.validateBody(request, DeleteTopicSchema);
    return Response.json(await chatController.deleteTopic(body));
  }
}

// 导出对应的 HTTP 方法
export const GET = TopicHttpController.GET;
export const POST = TopicHttpController.POST;
export const PUT = TopicHttpController.PUT;
export const DELETE = TopicHttpController.DELETE;