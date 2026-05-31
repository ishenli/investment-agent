import { WithRequestContextStatic } from '@/server/base/decorators';
import { BaseController } from '@/app/api/base/baseController';
import portfolioSnapshotService from '@/server/service/portfolioSnapshotService';
import { z } from 'zod';
import authService from '@/server/service/authService';
import logger from '@server/base/logger';

// 验证模式
const CreateSnapshotSchema = z.object({
  date: z.string().datetime().optional(),
  source: z.enum(['scheduled', 'manual', 'backfill']).optional(),
});

const ListSnapshotsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
});

export class SnapshotController extends BaseController {
  @WithRequestContextStatic()
  static async POST(request: Request) {
    try {
      // 获取当前用户账户
      const accountInfo = await authService.getCurrentUserAccount();
      if (!accountInfo) {
        return this.error('用户未登录', 'UNAUTHORIZED');
      }

      // 验证请求体
      const body = await this.validateBody(request, CreateSnapshotSchema);
      const accountId = parseInt(accountInfo.id);

      // 创建快照
      const snapshot = await portfolioSnapshotService.createSnapshot(
        accountId,
        body.date ? new Date(body.date) : new Date(),
        body.source || 'manual',
      );

      return this.success(snapshot);
    } catch (error) {
      logger.error('[SnapshotController] POST create snapshot failed:', error);
      if (error instanceof Error && error.message.includes('Validation')) {
        return this.responseValidateError(JSON.parse(error.message));
      }
      return this.error('创建快照失败', 'CREATE_SNAPSHOT_ERROR');
    }
  }

  @WithRequestContextStatic()
  static async GET(request: Request) {
    try {
      // 获取当前用户账户
      const accountInfo = await authService.getCurrentUserAccount();
      if (!accountInfo) {
        return this.error('用户未登录', 'UNAUTHORIZED');
      }

      // 获取查询参数
      const query = await this.validateParams(request, ListSnapshotsSchema);
      const accountId = parseInt(accountInfo.id);

      let snapshots;
      if (query.startDate || query.endDate) {
        const start = query.startDate ? new Date(query.startDate) : new Date(0);
        const end = query.endDate ? new Date(query.endDate) : new Date();
        snapshots = await portfolioSnapshotService.getSnapshotsByDateRange(
          accountId,
          start,
          end,
        );
        // getSnapshotsByDateRange returns ASC; normalize to DESC (newest first)
        snapshots.reverse();
      } else {
        snapshots = await portfolioSnapshotService.getAllSnapshots(accountId);
      }

      // 分页处理
      const limit = query.limit ? parseInt(query.limit) : 50;
      const offset = query.offset ? parseInt(query.offset) : 0;
      const paginatedSnapshots = snapshots.slice(offset, offset + limit);

      return this.success({
        items: paginatedSnapshots,
        totalCount: snapshots.length,
        limit,
        offset,
      });
    } catch (error) {
      logger.error('[SnapshotController] GET snapshots failed:', error);
      if (error instanceof Error && error.message.includes('Validation')) {
        return this.responseValidateError(JSON.parse(error.message));
      }
      return this.error('获取快照列表失败', 'GET_SNAPSHOTS_ERROR');
    }
  }
}

// 导出对应的 HTTP 方法
export const POST = SnapshotController.POST;
export const GET = SnapshotController.GET;