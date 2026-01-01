import { WithRequestContextStatic } from '@/server/base/decorators';
import { BaseController } from '@/app/api/base/baseController';
import reportService from '@/server/service/reportService';
import { AuthService } from '@/server/service/authService';
import { z } from 'zod';

// 定义请求体和参数的验证模式
const GenerateReportSchema = z.object({
  accountId: z.string().optional(),
  type: z.enum(['weekly', 'monthly']),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const ListReportsSchema = z.object({
  accountId: z.string().optional(),
  type: z.enum(['weekly', 'monthly', 'emergency']).optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
});

export class ReportController extends BaseController {
  @WithRequestContextStatic()
  static async POST(request: Request) {
    try {
      // 获取当前用户ID
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'UNAUTHORIZED');
      }

      // 验证请求体
      const body = await this.validateBody(request, GenerateReportSchema);

      const accountInfo = await AuthService.getCurrentUserAccount();
      const accountId = body.accountId || accountInfo?.id;

      if (!accountId) {
        return this.error('缺少 accountId', 'MISSING_ACCOUNT_ID');
      }

      // 生成报告
      const result = await reportService.generateReport({
        accountId,
        type: body.type,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      });

      return this.success(result);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Validation')) {
        return this.responseValidateError(JSON.parse(error.message));
      }
      return this.error('生成报告失败', 'GENERATE_REPORT_ERROR');
    }
  }

  @WithRequestContextStatic()
  static async GET(request: Request) {
    try {
      // 获取当前用户ID
      const accountInfo = await AuthService.getCurrentUserAccount();
      if (!accountInfo) {
        return this.error('用户未登录', 'UNAUTHORIZED');
      }

      // 获取查询参数
      const query = await this.validateParams(request, ListReportsSchema);

      // 获取报告列表
      const limit = query.limit ? parseInt(query.limit) : 20;
      const offset = query.offset ? parseInt(query.offset) : 0;

      const result = await reportService.getReports(accountInfo.id, query.type, limit, offset);

      return this.success(result);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Validation')) {
        return this.responseValidateError(JSON.parse(error.message));
      }
      return this.error('获取报告列表失败', 'GET_REPORTS_ERROR');
    }
  }
}

// 导出对应的 HTTP 方法
export const POST = ReportController.POST;
export const GET = ReportController.GET;

