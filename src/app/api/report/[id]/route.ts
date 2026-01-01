import { WithRequestContextStatic } from '@/server/base/decorators';
import { BaseController } from '@/app/api/base/baseController';
import reportService from '@/server/service/reportService';
import { AuthService } from '@/server/service/authService';
import { z } from 'zod';

const ReportIdSchema = z.object({
  reportId: z.string(),
});

export class WeeklyReportDetailController extends BaseController {
  @WithRequestContextStatic()
  static async GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
      // 获取当前用户ID
      const accountInfo = await AuthService.getCurrentUserAccount();
      if (!accountInfo) {
        return this.error('用户未登录', 'UNAUTHORIZED');
      }

      const { id: reportId } = await params;
      const accountId = accountInfo.id;

      // 获取报告详情
      const result = await reportService.getReport(reportId, accountId);

      if (result) {
        return this.success(result);
      } else {
        return this.error('报告不存在', 'REPORT_NOT_FOUND');
      }
    } catch (error) {
      return this.error('获取报告详情失败', 'GET_REPORT_DETAIL_ERROR');
    }
  }

  @WithRequestContextStatic()
  static async DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
      // 获取当前用户ID
      const accountInfo = await AuthService.getCurrentUserAccount();
      if (!accountInfo) {
        return this.error('用户未登录', 'UNAUTHORIZED');
      }

      const { id: reportId } = await params;
      const accountId = accountInfo.id;

      // 删除报告
      const result = await reportService.deleteReport(reportId, accountId);

      if (result) {
        return this.success({ message: '报告删除成功' });
      } else {
        return this.error('报告删除失败', 'DELETE_REPORT_ERROR');
      }
    } catch (error) {
      return this.error('删除报告失败', 'DELETE_REPORT_ERROR');
    }
  }
}

export const GET = WeeklyReportDetailController.GET;
export const DELETE = WeeklyReportDetailController.DELETE;
