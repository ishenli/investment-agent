import { WithRequestContext } from '../base/decorators';
import authService from '../service/authService';
import reportService from '../service/reportService';
import { BaseBizController } from './base';

export class ReportController extends BaseBizController {
  @WithRequestContext()
  async generateReport(param: {
    accountId?: string;
    type: 'weekly' | 'monthly';
    startDate?: string;
    endDate?: string;
    modelSlug?: string; // 可选的模型标识，用于选择特定的 AI 模型
    agentType?: 'claude-sdk' | 'langchain'; // 可选的 Agent 类型，默认使用 claude-sdk
  }) {
    try {
      // 获取当前用户ID
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'UNAUTHORIZED');
      }

      // 获取账户信息
      const accountInfo = await authService.getCurrentUserAccount();
      const accountId = param.accountId || accountInfo?.id;

      if (!accountId) {
        return this.error('缺少 accountId', 'MISSING_ACCOUNT_ID');
      }

      // 生成报告
      const result = await reportService.generateReport({
        accountId,
        type: param.type,
        startDate: param.startDate ? new Date(param.startDate) : undefined,
        endDate: param.endDate ? new Date(param.endDate) : undefined,
        modelSlug: param.modelSlug,
        agentType: param.agentType,
      });

      return this.success(result);
    } catch (error) {
      return this.error('生成报告失败', 'GENERATE_REPORT_ERROR');
    }
  }

  @WithRequestContext()
  async getReports(param: {
    accountId?: string;
    type?: 'weekly' | 'monthly' | 'emergency';
    limit?: string;
    offset?: string;
  }) {
    try {
      // 获取当前用户ID
      const accountInfo = await authService.getCurrentUserAccount();
      if (!accountInfo) {
        return this.error('用户未登录', 'UNAUTHORIZED');
      }

      // 获取报告列表
      const limit = param.limit ? parseInt(param.limit) : 20;
      const offset = param.offset ? parseInt(param.offset) : 0;

      const result = await reportService.getReports(
        accountInfo.id,
        param.type,
        limit,
        offset,
      );

      return this.success(result);
    } catch (error) {
      return this.error('获取报告列表失败', 'GET_REPORTS_ERROR');
    }
  }
}
