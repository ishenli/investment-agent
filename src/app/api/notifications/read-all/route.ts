import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '../../base/baseController';
import notificationController from '@/server/controller/notification';

class NotificationMarkAllReadHttpController extends BaseController {
  /**
   * POST /api/notifications/read-all - 批量标记所有通知为已读
   */
  @WithRequestContext()
  static async POST(request: Request) {
    return Response.json(await notificationController.markAllAsRead());
  }
}

// 导出对应的 HTTP 方法
export const POST = NotificationMarkAllReadHttpController.POST;