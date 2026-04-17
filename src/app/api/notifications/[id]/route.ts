import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '../../base/baseController';
import notificationController from '@/server/controller/notification';

class NotificationIdHttpController extends BaseController {
  /**
   * DELETE /api/notifications/:id - 删除通知
   */
  @WithRequestContext()
  static async DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const notificationId = parseInt(id, 10);
    return Response.json(await notificationController.deleteNotification({ id: notificationId }));
  }
}

// 导出对应的 HTTP 方法
export const DELETE = NotificationIdHttpController.DELETE;
