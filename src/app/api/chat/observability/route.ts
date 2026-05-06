/**
 * GET /api/chat/observability
 *
 * 获取当前会话的观测数据汇总
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
});

class ObservabilityController extends BaseController {
  @WithRequestContextStatic()
  static async GET(request: NextRequest) {
    try {
      const { searchParams } = new URL(request.url);
      const sessionId = searchParams.get('sessionId');
      if (!sessionId) {
        return this.error('需要 sessionId', 'missing_session_id');
      }

      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      const sessionMetrics = await observabilityService.getSessionMetrics(sessionId);
      const recentTraces = await observabilityService.findTracesBySession(sessionId, { limit: 10 });

      return this.success({ sessionMetrics, recentTraces });
    } catch (error) {
      logger.error('[ObservabilityController] GET error:', error);
      return this.error('获取观测数据失败', 'observability_error');
    }
  }
}

export const GET = ObservabilityController.GET;
