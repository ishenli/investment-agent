import { WithRequestContextStatic } from '@server/base/decorators';
import { BaseController } from '../../../base/baseController';
import { ModelProviderBizController } from '@server/controller/modelProvider';

/**
 * Get Available Models API Route
 *
 * Returns all active models configured for the current user's account.
 */
class AvailableModelsController extends BaseController {
  /**
   * GET: Get all available models for the current user
   */
  @WithRequestContextStatic()
  static async GET() {
    const controller = new ModelProviderBizController();
    return Response.json(await controller.getAvailableModels());
  }
}

export const GET = AvailableModelsController.GET;