import { WithRequestContext, WithRequestContextStatic } from '@server/base/decorators';
import { BaseController } from '../../../base/baseController';
import { AuthService } from '@server/service/authService';
import { modelProviderResolver } from '@server/service/modelProviderResolver';

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
    try {
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      const account = await AuthService.getCurrentUserAccount();
      if (!account) {
        return this.error('未找到账户', 'account_not_found');
      }

      const accountId = parseInt(account.id);

      // Get available models from database
      const models = await modelProviderResolver.getAvailableModels(accountId);

      // Get the default model
      const defaultModel = await modelProviderResolver.getDefaultModelSlug(accountId);

      return this.success({
        models,
        defaultModel,
      });
    } catch (error) {
      return this.error('获取可用模型列表失败', 'get_models_error');
    }
  }
}

export const GET = AvailableModelsController.GET;