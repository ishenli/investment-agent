import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '@renderer/api/base/baseController';
import { AssetAccountBizController } from '@/server/controller/assetAccount';

class AssetAccountBalanceHttpController extends BaseController {
  static controller = new AssetAccountBizController();
  
  @WithRequestContext()
  static async PUT(request: Request) {
    const body = await super.getBody(request);
    return Response.json(await AssetAccountBalanceHttpController.controller.updateAccountBalance(body));
  }
}

export const PUT = AssetAccountBalanceHttpController.PUT;
