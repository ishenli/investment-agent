import { BaseController } from '../../../base/baseController';
import { ModelProviderBizController } from '@/server/controller/modelProvider';
import { WithRequestContextStatic } from '@/server/base/decorators';

class ProviderModelsHttpController extends BaseController {
  @WithRequestContextStatic()
  static async GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const controller = new ModelProviderBizController();
    return Response.json(await controller.getModels({ id }));
  }

  @WithRequestContextStatic()
  static async POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const controller = new ModelProviderBizController();
    const body = await super.getBody(request);
    // Add providerId from URL params to body
    body.providerId = id;
    return Response.json(await controller.createModel(body));
  }

  @WithRequestContextStatic()
  static async PUT(request: Request) {
    const controller = new ModelProviderBizController();
    const body = await super.getBody(request);
    return Response.json(await controller.updateModel(body));
  }

  @WithRequestContextStatic()
  static async DELETE(request: Request) {
    const controller = new ModelProviderBizController();
    const body = await super.getBody(request);
    return Response.json(await controller.deleteModel(body));
  }
}

export const GET = ProviderModelsHttpController.GET;
export const POST = ProviderModelsHttpController.POST;
export const PUT = ProviderModelsHttpController.PUT;
export const DELETE = ProviderModelsHttpController.DELETE;