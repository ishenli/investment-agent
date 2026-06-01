import { z } from 'zod';
import { WithRequestContext } from '../base/decorators';
import authService from '../service/authService';
import aiInsightService from '../service/aiInsightService';
import { BaseBizController } from './base';

const ListInsightsQuerySchema = z.object({
  page: z
    .string()
    .transform((v) => parseInt(v))
    .pipe(z.number().min(1))
    .optional(),
  pageSize: z
    .string()
    .transform((v) => parseInt(v))
    .pipe(z.number().min(1).max(100))
    .optional(),
  source: z.enum(['manual', 'scheduled']).optional(),
  type: z.enum(['opportunity', 'risk', 'suggestion']).optional(),
  accountId: z
    .string()
    .transform((v) => parseInt(v))
    .pipe(z.number().min(1))
    .optional(),
});

export class AiInsightController extends BaseBizController {
  // ============== List ==============

  @WithRequestContext()
  async listInsights(query: Record<string, string>) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      const parsed = ListInsightsQuerySchema.safeParse(query);
      if (!parsed.success) {
        return this.error('参数格式无效', 'validation_error');
      }

      const result = await aiInsightService.getInsights(parseInt(userId), {
        page: parsed.data.page,
        pageSize: parsed.data.pageSize,
        source: parsed.data.source,
        type: parsed.data.type,
        accountId: parsed.data.accountId,
      });

      return this.success(result);
    } catch (error) {
      return this.error('获取洞察列表失败', 'list_insights_error');
    }
  }

  // ============== Get by ID ==============

  @WithRequestContext()
  async getInsightById(param: { id: string }) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      const insightId = parseInt(param.id);
      if (isNaN(insightId)) {
        return this.error('洞察ID无效', 'validation_error');
      }

      const insight = await aiInsightService.getInsightById(insightId);
      if (!insight) {
        return this.error('洞察不存在', 'insight_not_found');
      }

      return this.success(insight);
    } catch (error) {
      return this.error('获取洞察详情失败', 'get_insight_error');
    }
  }

  // ============== Get by Job ID ==============

  @WithRequestContext()
  async getInsightsByJobId(param: { jobId: string }) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      const jobId = parseInt(param.jobId);
      if (isNaN(jobId)) {
        return this.error('任务ID无效', 'validation_error');
      }

      const insights = await aiInsightService.getInsightsByJobId(jobId);
      return this.success(insights);
    } catch (error) {
      return this.error('获取任务洞察失败', 'get_job_insights_error');
    }
  }
}
