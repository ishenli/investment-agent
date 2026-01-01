import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '@renderer/api/base/baseController';
import { AssetAccountBizController } from '@/server/controller/assetAccount';

class AssetAccountTransactionHttpController extends BaseController {
  static controller = new AssetAccountBizController();
  
  @WithRequestContext()
  static async PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const body = await super.getBody(request);
    const { id } = await params;
    // 合并参数和请求体
    const requestData = { ...body, id };
    return Response.json(await AssetAccountTransactionHttpController.controller.updateTransaction(requestData));
  }
}

export const PUT = AssetAccountTransactionHttpController.PUT;
