import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '@renderer/api/base/baseController';
import { AssetAccountBizController } from '@/server/controller/assetAccount';

class AssetAccountTransactionsHttpController extends BaseController {
  static controller = new AssetAccountBizController();
  
  @WithRequestContext()
  static async GET(request: Request) {
    const json = await super.getQuery(request);
    return Response.json(await AssetAccountTransactionsHttpController.controller.getTransactionHistory(json));
  }

  @WithRequestContext()
  static async POST(request: Request) {
    const body = await super.getBody(request);
    return Response.json(await AssetAccountTransactionsHttpController.controller.addTransaction(body));
  }
}

export const GET = AssetAccountTransactionsHttpController.GET;
export const POST = AssetAccountTransactionsHttpController.POST;
