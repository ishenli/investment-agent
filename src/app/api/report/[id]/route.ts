import { BaseController } from '@/app/api/base/baseController';
import { WithRequestContextStatic } from '@/server/base/decorators';
import { ReportDetailController } from '@/server/controller/reportDetail';
import { z } from 'zod';

const UpdateReportSchema = z.object({
  content: z.string().min(1, '内容不能为空'),
});

export class ReportDetailHttpController extends BaseController {
  @WithRequestContextStatic()
  static async GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
      const reportDetailController = new ReportDetailController();
      const { id: reportId } = await params;

      // 调用业务控制器
      return Response.json(await reportDetailController.getReportDetail({ reportId }));
    } catch (error) {
      return this.error('获取报告详情失败', 'GET_REPORT_DETAIL_ERROR');
    }
  }

  @WithRequestContextStatic()
  static async DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
      const reportDetailController = new ReportDetailController();
      const { id: reportId } = await params;

      // 调用业务控制器
      return Response.json(await reportDetailController.deleteReport({ reportId }));
    } catch (error) {
      return this.error('删除报告失败', 'DELETE_REPORT_ERROR');
    }
  }

  @WithRequestContextStatic()
  static async PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
      const reportDetailController = new ReportDetailController();
      const { id: reportId } = await params;

      // 验证请求体
      const body = await this.validateBody(request, UpdateReportSchema);

      // 调用业务控制器
      return Response.json(
        await reportDetailController.updateReportContent({
          reportId,
          content: body.content,
        }),
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('Validation')) {
        return this.responseValidateError(JSON.parse(error.message));
      }
      return this.error('更新报告失败', 'UPDATE_REPORT_ERROR');
    }
  }
}

export const GET = ReportDetailHttpController.GET;
export const DELETE = ReportDetailHttpController.DELETE;
export const PATCH = ReportDetailHttpController.PATCH;
