/**
 * Claude Permission Response API
 * 
 * 用于前端响应 Claude SDK 的权限请求
 * 当用户批准或拒绝权限时调用此接口
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { BaseController } from '../../base/baseController';
import { WithRequestContextStatic } from '@server/base/decorators';
import { resolvePendingPermission } from '@/server/core/agents/claude/permissionRegistry';
import logger from '@server/base/logger';
import type { PermissionResult } from '@anthropic-ai/claude-agent-sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Zod 验证 Schema - 简化版,让 SDK 处理复杂的权限更新
const PermissionResponseSchema = z.object({
  permissionRequestId: z.string(),
  decision: z.union([
    z.object({
      behavior: z.literal('allow'),
      updatedInput: z.record(z.string(), z.unknown()).optional(),
    }),
    z.object({
      behavior: z.literal('deny'),
      message: z.string().optional(),
    }),
  ]),
});

class PermissionController extends BaseController {
  @WithRequestContextStatic()
  static async POST(request: NextRequest) {
    try {
      // 1. 参数验证
      const body = await this.validateBody(request, PermissionResponseSchema);
      const { permissionRequestId, decision } = body;

      logger.info(
        `[PermissionController] Received permission response: ${permissionRequestId}, decision: ${decision.behavior}`,
      );

      // 2. 将前端决策转换为 SDK 期望的格式
      const permissionResult: PermissionResult = 
        decision.behavior === 'allow'
          ? { behavior: 'allow', updatedInput: decision.updatedInput }
          : { behavior: 'deny', message: decision.message || 'User denied permission' };

      // 3. 解析权限请求
      const success = resolvePendingPermission(permissionRequestId, permissionResult);

      if (!success) {
        return this.error('权限请求不存在或已过期', 'permission_not_found');
      }

      return this.success({
        permissionRequestId,
        resolved: true,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }

      logger.error('[PermissionController] Error processing permission response:', error);
      return this.error('处理权限响应时发生错误', 'permission_response_error');
    }
  }
}

export const POST = PermissionController.POST;
