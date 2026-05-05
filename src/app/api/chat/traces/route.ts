/**
 * GET /api/chat/traces
 *
 * 获取当前会话的执行追踪列表（支持分页和过滤）
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { BaseController } from '../../base/baseController';
import { WithRequestContextStatic } from '@server/base/decorators';
import { observabilityService } from '@server/service/observabilityService';
import authService from '@server/service/authService';
import logger from '@server/base/logger';

const QuerySchema = z.object({
  sessionId: z.string(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['running', 'completed', 'error']).optional(),
});

class TracesController extends BaseController {
  @WithRequestContextStatic()
  static async GET(request: NextRequest) {
    try {
      const { searchParams } = new URL(request.url);
      const params = QuerySchema.parse({
        sessionId: searchParams.get('sessionId'),
        page: searchParams.get('page') ?? '1',
        limit: searchParams.get('limit') ?? '20',
        status: searchParams.get('status') ?? undefined,
      });

      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      const offset = (params.page - 1) * params.limit;
      const traces = await observabilityService.findTracesBySession(params.sessionId, {
        limit: params.limit,
        offset,
      });

      return this.success({
        page: params.page,
        limit: params.limit,
        traces,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }
      logger.error('[TracesController] GET error:', error);
      return this.error('获取 traces 失败', 'traces_error');
    }
  }
}

export const GET = TracesController.GET;
