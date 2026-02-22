import { WithRequestContext } from '../base/decorators';
import authService from '../service/authService';
import reportService from '../service/reportService';
import { BaseBizController } from './base';

export class ReportDetailController extends BaseBizController {
  @WithRequestContext()
  async getReportDetail(param: { reportId: string }) {
    try {
      // 获取当前用户ID
      const accountInfo = await authService.getCurrentUserAccount();
      if (!accountInfo) {
        return this.error('用户未登录', 'UNAUTHORIZED');
      }

      if (!param.reportId) {
        return this.error('报告ID不能为空', 'VALIDATION_ERROR');
      }

      const accountId = accountInfo.id;

      // 获取报告详情
      const result = await reportService.getReport(param.reportId, accountId);

      if (result) {
        return this.success(result);
      } else {
        return this.error('报告不存在', 'REPORT_NOT_FOUND');
      }
    } catch (error) {
      return this.error('获取报告详情失败', 'GET_REPORT_DETAIL_ERROR');
    }
  }

  @WithRequestContext()
  async deleteReport(param: { reportId: string }) {
    try {
      // 获取当前用户ID
      const accountInfo = await authService.getCurrentUserAccount();
      if (!accountInfo) {
        return this.error('用户未登录', 'UNAUTHORIZED');
      }

      if (!param.reportId) {
        return this.error('报告ID不能为空', 'VALIDATION_ERROR');
      }

      const accountId = accountInfo.id;

      // 删除报告
      const result = await reportService.deleteReport(param.reportId, accountId);

      if (result) {
        return this.success({ message: '报告删除成功' });
      } else {
        return this.error('报告删除失败', 'DELETE_REPORT_ERROR');
      }
    } catch (error) {
      return this.error('删除报告失败', 'DELETE_REPORT_ERROR');
    }
  }

  @WithRequestContext()
  async updateReportContent(param: { reportId: string; content: string }) {
    try {
      // 获取当前用户ID
      const accountInfo = await authService.getCurrentUserAccount();
      if (!accountInfo) {
        return this.error('用户未登录', 'UNAUTHORIZED');
      }

      if (!param.reportId) {
        return this.error('报告ID不能为空', 'VALIDATION_ERROR');
      }

      if (!param.content) {
        return this.error('内容不能为空', 'VALIDATION_ERROR');
      }

      const accountId = accountInfo.id;

      // 更新报告内容
      const result = await reportService.updateReportContent(
        param.reportId,
        accountId,
        param.content,
      );

      if (result) {
        return this.success(result);
      } else {
        return this.error('报告更新失败', 'UPDATE_REPORT_ERROR');
      }
    } catch (error) {
      return this.error('更新报告失败', 'UPDATE_REPORT_ERROR');
    }
  }
}
