import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '../base/baseController';
import { AccountBizController } from '@/server/controller/account';

class AccountHttpController extends BaseController {
  static controller = new AccountBizController();
  @WithRequestContext()
  static async POST(request: Request) {
    const body = await super.getBody(request);
    
    return Response.json(await AccountHttpController.controller.createAccount(body));
  }

  @WithRequestContext()
  static async GET(request: Request) {
    const json = await super.getQuery(request);
    return Response.json(await AccountHttpController.controller.getAccount(json));
  }

  @WithRequestContext()
  static async PUT(request: Request) {
    const body = await super.getBody(request);
    const json = await super.getQuery(request);
    // 合并查询参数和请求体
    const params = { ...json, ...body };
    return Response.json(await AccountHttpController.controller.updateAccount(params));
  }
}

// 导出对应的 HTTP 方法
export const POST = AccountHttpController.POST;
export const GET = AccountHttpController.GET;
export const PUT = AccountHttpController.PUT;
