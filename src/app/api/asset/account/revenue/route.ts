import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '@renderer/api/base/baseController';
import { AssetAccountBizController } from '@/server/controller/assetAccount';

class AssetAccountRevenueHttpController extends BaseController {
  static controller = new AssetAccountBizController();
  
  @WithRequestContext()
  static async GET(request: Request) {
    const json = await super.getQuery(request);
    return Response.json(await AssetAccountRevenueHttpController.controller.getRevenueMetrics(json));
  }
}

export const GET = AssetAccountRevenueHttpController.GET;
