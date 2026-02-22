import { WithRequestContext } from '../base/decorators';
import schedulerService from '../service/schedulerService';
import { BaseBizController } from './base';

export class ScheduledController extends BaseBizController {
  @WithRequestContext()
  async checkAndRunTasks(param: {
    force?: boolean;
    backfillDays?: number;
  }) {
    try {
      // 验证参数
      if (param.backfillDays !== undefined && (param.backfillDays < 1 || param.backfillDays > 30)) {
        return this.error('backfillDays 必须在 1-30 之间', 'VALIDATION_ERROR');
      }

      // 执行任务检查
      const result = await schedulerService.checkAndRunTasks({
        force: param.force ?? false,
        backfillDays: param.backfillDays ?? 7,
      });

      return this.success({
        message: '任务检查完成',
        result,
      });
    } catch (error) {
      return this.error('执行任务检查失败', 'SCHEDULED_TASK_ERROR');
    }
  }

  @WithRequestContext()
  async getTaskStatusSummary() {
    try {
      const status = await schedulerService.getTaskStatusSummary();

      return this.success({
        dailySnapshot: {
          taskType: status.dailySnapshot.taskType,
          executed: status.dailySnapshot.executed,
          lastExecutionDate: status.dailySnapshot.lastExecutionDate?.toISOString(),
          lastStatus: status.dailySnapshot.lastStatus,
        },
        priceSync: {
          taskType: status.priceSync.taskType,
          executed: status.priceSync.executed,
          lastExecutionDate: status.priceSync.lastExecutionDate?.toISOString(),
          lastStatus: status.priceSync.lastStatus,
        },
      });
    } catch (error) {
      return this.error('获取任务状态失败', 'GET_TASK_STATUS_ERROR');
    }
  }
}
