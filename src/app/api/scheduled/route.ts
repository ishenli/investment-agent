import { BaseController } from '@/app/api/base/baseController';
import { WithRequestContextStatic } from '@/server/base/decorators';
import { ScheduledController as ScheduledBizController } from '@/server/controller/scheduled';
import { z } from 'zod';

// 验证模式
const CheckAndRunSchema = z.object({
  force: z.boolean().optional().default(false),
  backfillDays: z.number().min(1).max(30).optional().default(7),
});

/**
 * 定时任务 API 控制器
 *
 * POST /api/scheduled/check-and-run - 检查并执行任务
 * GET /api/scheduled/status - 获取任务执行状态
 */
export class ScheduledHttpController extends BaseController {
  /**
   * 检查并执行定时任务
   *
   * 应用启动时调用，自动检查遗漏的任务并执行
   */
  @WithRequestContextStatic()
  static async POST(request: Request) {
    try {
      const scheduledController = new ScheduledBizController();
      // 验证请求体
      const body = await this.validateBody(request, CheckAndRunSchema);

      // 调用业务控制器
      return Response.json(await scheduledController.checkAndRunTasks(body));
    } catch (error) {
      if (error instanceof Error && error.message.includes('Validation')) {
        return this.responseValidateError(JSON.parse(error.message));
      }
      return this.error('执行任务检查失败', 'SCHEDULED_TASK_ERROR');
    }
  }

  /**
   * 获取任务执行状态
   *
   * 返回最近的任务执行记录
   */
  @WithRequestContextStatic()
  static async GET() {
    try {
      const scheduledController = new ScheduledBizController();
      
      // 调用业务控制器
      return Response.json(await scheduledController.getTaskStatusSummary());
    } catch (error) {
      return this.error('获取任务状态失败', 'GET_TASK_STATUS_ERROR');
    }
  }
}

// 导出对应的 HTTP 方法
export const POST = ScheduledHttpController.POST;
export const GET = ScheduledHttpController.GET;