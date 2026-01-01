import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '@renderer/api/base/baseController';
import { PositionBizController } from '@/server/controller/position';

class AssetAccountPositionsHttpController extends BaseController {
  static controller = new PositionBizController();
  
  @WithRequestContext()
  static async GET(request: Request) {
    const json = await super.getQuery(request);
    return Response.json(await AssetAccountPositionsHttpController.controller.getPositions(json));
  }
}

export const GET = AssetAccountPositionsHttpController.GET;
