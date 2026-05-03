import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '../../../base/baseController';
import notificationController from '@/server/controller/notification';

class NotificationMarkReadHttpController extends BaseController {
  /**
   * PATCH /api/notifications/:id/read - 标记单条通知为已读
   */
  @WithRequestContext()
  static async PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const notificationId = parseInt(id, 10);
    return Response.json(await notificationController.markAsRead({ id: notificationId }));
  }
}

// 导出对应的 HTTP 方法
export const PATCH = NotificationMarkReadHttpController.PATCH;
