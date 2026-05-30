/**
 * Agent Runtime Asset Controller
 *
 * Validates parameters and routes calls to AgentRuntimeAssetService.
 * No business logic — all file I/O is in the service layer.
 */

import { WithRequestContext } from '@server/base/decorators';
import authService from '@server/service/authService';
import { agentRuntimeAssetService } from '@server/service/agentRuntimeAssetService';
import { BaseBizController } from './base';
import { z } from 'zod';
import logger from '@server/base/logger';

// ─── Validation schemas ───────────────────────────────────────────────────────

const RuntimeEnum = z.enum(['claude', 'hermes']);
const AssetTypeEnum = z.enum(['memory', 'user', 'skill']);

export const ListAssetsSchema = z.object({
  runtime: RuntimeEnum.optional(),
  assetType: AssetTypeEnum.optional(),
});

export const GetAssetSchema = z.object({
  runtime: RuntimeEnum,
  assetId: z.string().min(1, 'assetId is required'),
});

export const SaveAssetSchema = z.object({
  runtime: RuntimeEnum,
  assetId: z.string().min(1, 'assetId is required'),
  content: z.string(),
});

// ─── Controller ───────────────────────────────────────────────────────────────

export class AgentRuntimeAssetBizController extends BaseBizController {
  @WithRequestContext()
  async listAssets(query: z.infer<typeof ListAssetsSchema>) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) return this.error('用户未登录', 'unauthorized');

      const parsed = await this.validateParams(query, ListAssetsSchema);

      if (parsed.runtime) {
        const result = await agentRuntimeAssetService.listAssets(
          parseInt(userId),
          parsed.runtime,
          parsed.assetType,
        );
        return this.success(result);
      }

      const results = await agentRuntimeAssetService.listAllAssets(
        parseInt(userId),
        parsed.assetType,
      );
      return this.success(results);
    } catch (error) {
      if (error instanceof z.ZodError) return this.responseValidateError(error);
      logger.error('[AgentRuntimeAssetController] List assets error:', error);
      return this.error('获取运行时资源列表失败', 'list_assets_error');
    }
  }

  @WithRequestContext()
  async getAsset(query: z.infer<typeof GetAssetSchema>) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) return this.error('用户未登录', 'unauthorized');

      const parsed = await this.validateParams(query, GetAssetSchema);
      const result = await agentRuntimeAssetService.getAsset(
        parseInt(userId),
        parsed.runtime,
        parsed.assetId,
      );

      if (!result) return this.error('资源不存在', 'asset_not_found');

      return this.success(result);
    } catch (error) {
      if (error instanceof z.ZodError) return this.responseValidateError(error);
      logger.error('[AgentRuntimeAssetController] Get asset error:', error);
      return this.error('获取运行时资源失败', 'get_asset_error');
    }
  }

  @WithRequestContext()
  async saveAsset(body: z.infer<typeof SaveAssetSchema>) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) return this.error('用户未登录', 'unauthorized');

      const parsed = await this.validateParams(body, SaveAssetSchema);
      const result = await agentRuntimeAssetService.saveAsset(
        parseInt(userId),
        parsed.runtime,
        parsed.assetId,
        parsed.content,
      );

      return this.success(result);
    } catch (error) {
      if (error instanceof z.ZodError) return this.responseValidateError(error);

      if (error instanceof Error) {
        if (error.message.includes('read-only')) {
          return this.error('该资源为只读', 'asset_read_only');
        }
        if (error.message.includes('exceeds maximum size')) {
          return this.error(error.message, 'asset_too_large');
        }
        if (error.message.includes('Unknown asset')) {
          return this.error('资源不存在', 'asset_not_found');
        }
      }

      logger.error('[AgentRuntimeAssetController] Save asset error:', error);
      return this.error('保存运行时资源失败', 'save_asset_error');
    }
  }
}
