import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '@renderer/api/base/baseController';
import { AccountBizController } from '@/server/controller/account';

class AccountSettingsHttpController extends BaseController {
  static controller = new AccountBizController();
  
  @WithRequestContext()
  static async GET(request: Request) {
    const json = await super.getQuery(request);
    return Response.json(await AccountSettingsHttpController.controller.getAccountSettings(json));
  }

  @WithRequestContext()
  static async PUT(request: Request) {
    const body = await super.getBody(request);
    const json = await super.getQuery(request);
    // 合并查询参数和请求体
    const params = { ...json, ...body };
    return Response.json(await AccountSettingsHttpController.controller.updateAccountSettings(params));
  }
}

export const GET = AccountSettingsHttpController.GET;
export const PUT = AccountSettingsHttpController.PUT;
