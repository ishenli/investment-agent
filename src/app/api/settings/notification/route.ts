import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '../../base/baseController';
import { SettingBizController } from '@/server/controller/setting';

class NotificationSettingsHttpController extends BaseController {
  static controller = new SettingBizController();

  /**
   * GET /api/settings/notification - 获取通知偏好设置
   */
  @WithRequestContext()
  static async GET(request: Request) {
    return Response.json(await NotificationSettingsHttpController.controller.getNotificationPreferences());
  }

  /**
   * PUT /api/settings/notification - 更新通知偏好设置
   */
  @WithRequestContext()
  static async PUT(request: Request) {
    const body = await super.getBody(request);
    return Response.json(await NotificationSettingsHttpController.controller.updateNotificationPreferences(body));
  }
}

export const GET = NotificationSettingsHttpController.GET;
export const PUT = NotificationSettingsHttpController.PUT;
