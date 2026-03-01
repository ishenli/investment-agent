import { BaseController } from '@/app/api/base/baseController';
import { WithRequestContextStatic } from '@/server/base/decorators';
import { ReportController as ReportBizController } from '@/server/controller/report';
import { z } from 'zod';

// 定义请求体和参数的验证模式
const GenerateReportSchema = z.object({
  accountId: z.string().optional(),
  type: z.enum(['weekly', 'monthly']),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  modelSlug: z.string().optional(), // 可选的模型标识，用于选择特定的 AI 模型
  agentType: z.enum(['claude-sdk', 'langchain']).optional(), // 可选的 Agent 类型，默认使用 claude-sdk
});

const ListReportsSchema = z.object({
  accountId: z.string().optional(),
  type: z.enum(['weekly', 'monthly', 'emergency']).optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
});

export class ReportHttpController extends BaseController {
  @WithRequestContextStatic()
  static async POST(request: Request) {
    try {
      const reportController = new ReportBizController();
      // 验证请求体
      const body = await this.validateBody(request, GenerateReportSchema);

      // 调用业务控制器
      return Response.json(await reportController.generateReport(body));
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
      const reportController = new ReportBizController();
      // 获取查询参数
      const query = await this.validateParams(request, ListReportsSchema);

      // 调用业务控制器
      return Response.json(await reportController.getReports(query));
    } catch (error) {
      if (error instanceof Error && error.message.includes('Validation')) {
        return this.responseValidateError(JSON.parse(error.message));
      }
      return this.error('获取报告列表失败', 'GET_REPORTS_ERROR');
    }
  }
}

// 导出对应的 HTTP 方法
export const POST = ReportHttpController.POST;
export const GET = ReportHttpController.GET;
