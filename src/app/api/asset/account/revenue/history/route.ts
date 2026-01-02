import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '@renderer/api/base/baseController';
import { AssetAccountBizController } from '@/server/controller/assetAccount';

class AssetAccountRevenueHistoryHttpController extends BaseController {
  static controller = new AssetAccountBizController();

  @WithRequestContext()
  static async GET(request: Request) {
    const json = await super.getQuery(request);
    return Response.json(await AssetAccountRevenueHistoryHttpController.controller.getRevenueHistory(json));
  }
}

export const GET = AssetAccountRevenueHistoryHttpController.GET;