import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '../base/baseController';
import notificationController from '@/server/controller/notification';

class NotificationHttpController extends BaseController {
  /**
   * GET /api/notifications - 获取通知列表
   * Query params:
   * - page: number (default: 1)
   * - pageSize: number (default: 20)
   * - isRead: 'all' | 'read' | 'unread' (default: 'all')
   * - type: NotificationType (optional)
   * - priority: NotificationPriority (optional)
   */
  @WithRequestContext()
  static async GET(request: Request) {
    const query = await BaseController.getQuery(request);
    return Response.json(await notificationController.getNotifications(query));
  }

  /**
   * POST /api/notifications - 创建新通知
   * Body: CreateNotificationRequestType
   */
  @WithRequestContext()
  static async POST(request: Request) {
    const body = await BaseController.getBody(request);
    return Response.json(await notificationController.createNotification(body));
  }
}

// 导出对应的 HTTP 方法
export const GET = NotificationHttpController.GET;
export const POST = NotificationHttpController.POST;
