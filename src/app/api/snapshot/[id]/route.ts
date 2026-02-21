import { WithRequestContextStatic } from '@/server/base/decorators';
import { BaseController } from '@/app/api/base/baseController';
import portfolioSnapshotService from '@/server/service/portfolioSnapshotService';
import { z } from 'zod';
import authService from '@/server/service/authService';

// 验证模式
const SnapshotIdSchema = z.object({
  id: z.string().regex(/^\d+$/),
});

export class SnapshotDetailController extends BaseController {
  @WithRequestContextStatic()
  static async GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
      // 获取当前用户账户
      const accountInfo = await authService.getCurrentUserAccount();
      if (!accountInfo) {
        return this.error('用户未登录', 'UNAUTHORIZED');
      }

      // 验证参数
      const { id } = await params;
      const validatedParams = SnapshotIdSchema.parse({ id });
      const snapshotId = parseInt(validatedParams.id);

      // 获取快照详情
      const snapshots = await portfolioSnapshotService.getAllSnapshots(parseInt(accountInfo.id));
      const snapshot = snapshots.find(s => s.id === snapshotId);

      if (!snapshot) {
        return this.error('快照不存在', 'SNAPSHOT_NOT_FOUND');
      }

      return this.success(snapshot);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Validation')) {
        return this.responseValidateError(JSON.parse(error.message));
      }
      return this.error('获取快照详情失败', 'GET_SNAPSHOT_ERROR');
    }
  }

  @WithRequestContextStatic()
  static async DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
      // 获取当前用户账户
      const accountInfo = await authService.getCurrentUserAccount();
      if (!accountInfo) {
        return this.error('用户未登录', 'UNAUTHORIZED');
      }

      // 验证参数
      const { id } = await params;
      const validatedParams = SnapshotIdSchema.parse({ id });
      const snapshotId = parseInt(validatedParams.id);

      // 删除快照
      const deleted = await portfolioSnapshotService.deleteSnapshot(snapshotId);

      if (!deleted) {
        return this.error('删除快照失败', 'DELETE_SNAPSHOT_ERROR');
      }

      return this.success({ message: '快照已删除' });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Validation')) {
        return this.responseValidateError(JSON.parse(error.message));
      }
      return this.error('删除快照失败', 'DELETE_SNAPSHOT_ERROR');
    }
  }
}

// 导出对应的 HTTP 方法
export const GET = SnapshotDetailController.GET;
export const DELETE = SnapshotDetailController.DELETE;