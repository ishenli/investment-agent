import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '../base/baseController';
import { SettingBizController } from '@/server/controller/setting';

class SettingHttpController extends BaseController {
  static controller = new SettingBizController();
  
  @WithRequestContext()
  static async GET(request: Request) {
    return Response.json(await SettingHttpController.controller.getSettings());
  }

  @WithRequestContext()
  static async PUT(request: Request) {
    const body = await super.getBody(request);
    return Response.json(await SettingHttpController.controller.updateSetting(body));
  }

  @WithRequestContext()
  static async DELETE(request: Request) {
    const json = await super.getQuery(request);
    return Response.json(await SettingHttpController.controller.deleteSetting(json));
  }
}

export const GET = SettingHttpController.GET;
export const PUT = SettingHttpController.PUT;
export const DELETE = SettingHttpController.DELETE;