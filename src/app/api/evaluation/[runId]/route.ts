import { BaseController } from '../../base/baseController';
import { WithRequestContextStatic } from '@/server/base/decorators';
import evaluationService from '@server/service/evaluationService';
import logger from '@server/base/logger';

class EvaluationDetailController extends BaseController {
  @WithRequestContextStatic()
  static async GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
    try {
      const { runId } = await params;
      const detail = await evaluationService.getRunDetail(runId);
      if (!detail) {
        return super.error('评测记录不存在', 'run_not_found');
      }
      return super.success(detail);
    } catch (error) {
      logger.error('[EvaluationDetailController] Failed to get run detail:', error);
      return super.error('获取评测详情失败', 'get_detail_error');
    }
  }

  @WithRequestContextStatic()
  static async DELETE(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
    try {
      const { runId } = await params;
      const deleted = await evaluationService.deleteRun(runId);
      if (!deleted) {
        return super.error('评测记录不存在', 'run_not_found');
      }
      return super.success({ runId });
    } catch (error) {
      logger.error('[EvaluationDetailController] Failed to delete run:', error);
      return super.error('删除评测记录失败', 'delete_run_error');
    }
  }
}

export const GET = EvaluationDetailController.GET;
export const DELETE = EvaluationDetailController.DELETE;
