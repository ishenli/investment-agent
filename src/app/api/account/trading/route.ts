import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '../../base/baseController';
import { AccountBizController } from '@/server/controller/account';

class AssetAccountHttpController extends BaseController {
  static controller = new AccountBizController();
  
  @WithRequestContext()
  static async POST(request: Request) {
    const body = await super.getBody(request);
    return Response.json(await AssetAccountHttpController.controller.createTradingAccount(body));
  }

  @WithRequestContext()
  static async GET(request: Request) {
    const json = await super.getQuery(request);
    return Response.json(await AssetAccountHttpController.controller.getTradingAccount(json));
  }

  @WithRequestContext()
  static async PUT(request: Request) {
    const body = await super.getBody(request);
    const json = await super.getQuery(request);
    // 合并查询参数和请求体
    const params = { ...json, ...body };
    return Response.json(await AssetAccountHttpController.controller.updateTradingAccount(params));
  }
}

export const POST = AssetAccountHttpController.POST;
export const GET = AssetAccountHttpController.GET;
export const PUT = AssetAccountHttpController.PUT;
