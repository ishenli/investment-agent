import { z } from 'zod';
import { WithRequestContext } from '../base/decorators';
import authService from '../service/authService';
import aiInsightService from '../service/aiInsightService';
import { BaseBizController } from './base';

const ListInsightHistoryQuerySchema = z.object({
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
});

export class AiInsightController extends BaseBizController {
  // ============== History（会话式） ==============

  @WithRequestContext()
  async listInsightHistory(query: Record<string, string>) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      const parsed = ListInsightHistoryQuerySchema.safeParse(query);
      if (!parsed.success) {
        return this.error('参数格式无效', 'validation_error');
      }

      const result = await aiInsightService.getInsightHistory(parseInt(userId), {
        page: parsed.data.page,
        pageSize: parsed.data.pageSize,
      });

      return this.success(result);
    } catch (error) {
      return this.error('获取洞察历史失败', 'list_insight_history_error');
    }
  }
}
