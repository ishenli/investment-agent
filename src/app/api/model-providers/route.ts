import { BaseController } from '../base/baseController';
import { ModelProviderBizController } from '@/server/controller/modelProvider';
import { WithRequestContextStatic } from '@/server/base/decorators';

class ModelProviderHttpController extends BaseController {
  @WithRequestContextStatic()
  static async GET(request: Request) {
    const controller = new ModelProviderBizController();
    return Response.json(await controller.getProviders());
  }

  @WithRequestContextStatic()
  static async POST(request: Request) {
    const controller = new ModelProviderBizController();
    const body = await super.getBody(request);
    return Response.json(await controller.createProvider(body));
  }

  @WithRequestContextStatic()
  static async PUT(request: Request) {
    const controller = new ModelProviderBizController();
    const body = await super.getBody(request);
    return Response.json(await controller.updateProvider(body));
  }

  @WithRequestContextStatic()
  static async DELETE(request: Request) {
    const controller = new ModelProviderBizController();
    const body = await super.getBody(request);
    return Response.json(await controller.deleteProvider(body));
  }
}

export const GET = ModelProviderHttpController.GET;
export const POST = ModelProviderHttpController.POST;
export const PUT = ModelProviderHttpController.PUT;
export const DELETE = ModelProviderHttpController.DELETE;