import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '@renderer/api/base/baseController';
import { AssetAccountBizController } from '@/server/controller/assetAccount';

class AssetAccountTransactionHttpController extends BaseController {
  static controller = new AssetAccountBizController();

  @WithRequestContext()
  static async PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const body = await super.getBody(request);
    const { id } = await params;
    const requestData = { ...body, id };
    return Response.json(
      await AssetAccountTransactionHttpController.controller.updateTransaction(requestData),
    );
  }

  @WithRequestContext()
  static async DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return Response.json(
      await AssetAccountTransactionHttpController.controller.reverseTransaction({ id }),
    );
  }
}

export const PUT = AssetAccountTransactionHttpController.PUT;
export const DELETE = AssetAccountTransactionHttpController.DELETE;
