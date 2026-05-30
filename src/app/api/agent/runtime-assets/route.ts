import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '../../base/baseController';
import { AgentRuntimeAssetBizController } from '@server/controller/agentRuntimeAsset';

class RuntimeAssetsHttpController extends BaseController {
  static controller = new AgentRuntimeAssetBizController();

  @WithRequestContext()
  static async GET(request: Request) {
    const query = await super.getQuery(request);

    if (query.runtime && query.assetId) {
      return Response.json(
        await RuntimeAssetsHttpController.controller.getAsset(query),
      );
    }

    return Response.json(
      await RuntimeAssetsHttpController.controller.listAssets(query),
    );
  }

  @WithRequestContext()
  static async PUT(request: Request) {
    const body = await super.getBody(request);
    return Response.json(
      await RuntimeAssetsHttpController.controller.saveAsset(body),
    );
  }
}

export const GET = RuntimeAssetsHttpController.GET;
export const PUT = RuntimeAssetsHttpController.PUT;
