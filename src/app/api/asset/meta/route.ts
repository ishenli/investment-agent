import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '@renderer/api/base/baseController';
import { AssetMetaBizController } from '@/server/controller/assetMeta';

class AssetMetaHttpController extends BaseController {
  static controller = new AssetMetaBizController();
  
  @WithRequestContext()
  static async GET(request: Request) {
    const json = await super.getQuery(request);
    return Response.json(await AssetMetaHttpController.controller.getAllAssetMetas(json));
  }

  @WithRequestContext()
  static async POST(request: Request) {
    const body = await super.getBody(request);
    return Response.json(await AssetMetaHttpController.controller.createAssetMeta(body));
  }

  @WithRequestContext()
  static async PUT(request: Request) {
    const body = await super.getBody(request);
    return Response.json(await AssetMetaHttpController.controller.updateAssetMeta(body));
  }

  @WithRequestContext()
  static async DELETE(request: Request) {
    const json = await super.getQuery(request);
    return Response.json(await AssetMetaHttpController.controller.deleteAssetMeta(json));
  }
}

export const GET = AssetMetaHttpController.GET;
export const POST = AssetMetaHttpController.POST;
export const PUT = AssetMetaHttpController.PUT;
export const DELETE = AssetMetaHttpController.DELETE;
