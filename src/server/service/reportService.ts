import { db } from '@server/lib/db';
import { analysisReports, accounts } from '@/drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import logger from '@server/base/logger';
import transactionService from './transactionService';
import finnhubService from './finnhubService';
import noteService from './noteService';
import assetMarketInfoService from './assetMarketInfoService';
import assetMetaService from './assetMetaService';
import positionService from './positionService';
import { AuthService } from './authService';
import { AssetMarketInfoType } from '@/types/marketInfo';
import { NoteType } from './noteService';
import { PositionType } from '@typings/position';
import { AssetMetaType } from '@/types/assetMeta';
import { chatModelOpenAI, ModelMap } from '@server/core/provider/chatModel';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { recordPrompt } from '../utils/file';
import { createAgent } from 'langchain';
import { noteQueryTool, stockRecallCompanyInfoTool, stockSearchNewsTool, TravilySearchTool } from '../core/tools';

// 报告类型枚举
export type ReportType = 'weekly' | 'monthly' | 'emergency';

// 报告状态枚举
export type ReportStatus = 'pending' | 'processing' | 'completed' | 'failed';

// 生成报告请求类型
export type GenerateReportRequest = {
  accountId: string;
  type: ReportType;
  startDate?: Date;
  endDate?: Date;
};

// 报告列表项类型
export type ReportListItem = {
  id: string;
  title: string;
  type: ReportType;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
};

// 报告详情类型
export type ReportDetail = {
  id: string;
  accountId: string;
  type: ReportType;
  title: string;
  content: string;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
};

// 本周业绩数据类型
export type WeeklyPerformance = {
  totalValue: number;
  previousValue: number;
  changeAmount: number;
  changePercentage: number;
  benchmarkPerformance?: number;
  maxDrawdown?: number;
  sharpeRatio?: number;
};

// 持仓变化数据类型
export type PositionChange = {
  symbol: string;
  currentQuantity: number;
  averageCost: number;
  currentPrice: number;
  changePercentage: number;
  contribution: number;
};

// 周报数据聚合类型
export type WeeklyReportData = {
  performance: WeeklyPerformance;
  transactions: any[]; // 使用 any 以避免循环依赖，实际应为 TransactionRecordType
  marketEvents: AssetMarketInfoType[];
  notes: NoteType[];
  investmentMemos: AssetMetaType[];
};

export class ReportService {
  constructor() {
    // 数据库连接已经在 db.ts 中初始化
  }

  /**
   * 生成新的分析报告
   * @param request 生成报告请求
   * @returns 报告ID和状态
   */
  async generateReport(request: GenerateReportRequest): Promise<{ id: string; status: ReportStatus; message?: string }> {
    try {
      logger.info('[ReportService] 开始生成报告', { accountId: request.accountId, type: request.type });

      // 验证账户是否存在
      const account = await db.query.accounts.findFirst({
        where: eq(accounts.id, parseInt(request.accountId)),
      });

      if (!account) {
        throw new Error(`账户 ${request.accountId} 不存在`);
      }

      // 确定报告时间范围
      const { startDate, endDate } = this.determineDateRange(request.type, request.startDate, request.endDate);

      // 设置报告标题
      const title = this.generateReportTitle(request.type, startDate, endDate);

      // 创建报告记录（初始状态）
      const [reportRecord] = await db
        .insert(analysisReports)
        .values({
          accountId: parseInt(request.accountId),
          type: request.type,
          title,
          content: '报告生成中...',
          startDate,
          endDate,
          createdAt: new Date(),
        })
        .returning();

      // 异步生成报告内容
      this.processReportGeneration(reportRecord.id.toString(), request.accountId, startDate, endDate)
        .catch(error => {
          logger.error('[ReportService] 报告生成失败', { reportId: reportRecord.id, error });
          // 更新报告状态为失败
          this.updateReportContent(reportRecord.id.toString(), `报告生成失败: ${error.message}`);
        });

      logger.info('[ReportService] 报告生成请求已接受', { reportId: reportRecord.id });

      return {
        id: reportRecord.id.toString(),
        status: 'pending',
      };
    } catch (error) {
      logger.error('[ReportService] 生成报告失败', { error });
      throw new Error(`生成报告失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 处理报告生成过程
   * @param reportId 报告ID
   * @param accountId 账户ID
   * @param startDate 开始日期
   * @param endDate 结束日期
   */
  private async processReportGeneration(reportId: string, accountId: string, startDate: Date, endDate: Date): Promise<void> {
    try {
      // 更新报告状态为处理中
      await this.updateReportContent(reportId, '正在收集数据...');

      // 聚合本周数据
      const reportData = await this.aggregateWeeklyData(accountId, startDate, endDate);

      // 更新报告状态为生成AI内容中
      await this.updateReportContent(reportId, '正在生成AI分析...');

      // 生成AI报告内容
      const reportContent = await this.generateAIReportContent(reportData);

      // 更新报告内容
      await this.updateReportContent(reportId, reportContent);

      logger.info('[ReportService] 报告生成完成', { reportId });
    } catch (error) {
      logger.error('[ReportService] 报告生成过程失败', { reportId, error });
      throw error;
    }
  }

  /**
   * 聚合本周数据
   * @param accountId 账户ID
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 聚合的数据
   */
  private async aggregateWeeklyData(accountId: string, startDate: Date, endDate: Date): Promise<WeeklyReportData> {
    try {
      // 获取本周交易记录
      const transactions = await transactionService.getTransactionHistory(accountId, 100, 0);
      const weeklyTransactions = transactions.transactions.filter(t =>
        t.createdAt && t.createdAt >= startDate && t.createdAt <= endDate
      );

      // 获取本周市场事件
      const marketEvents = await assetMarketInfoService.getAssetMarketInfosByDateRange(startDate, endDate, 50);

      // 获取本周用户笔记
      // 注意：noteService.searchNotes 按用户ID搜索，但这里需要按账户ID搜索
      // 我们假设账户ID与用户ID相同，或者需要修改 noteService 以支持账户ID搜索
      const userId = await AuthService.getCurrentUserId();
      const notes = userId ? await noteService.getUserNotes(userId, 50, 0, 'createdAt', 'desc') : { items: [], totalCount: 0 };
      const weeklyNotes = notes.items.filter(n =>
        n.createdAt >= startDate && n.createdAt <= endDate
      );

      // 获取当前持仓
      const currentPositions = await positionService.getCurrentPositions(accountId);

      // 获取核心持仓的投资备忘录，且备忘录不为空
      const investmentMemos: AssetMetaType[] = [];
      for (const position of currentPositions) {
        const assetMetas = await assetMetaService.searchAssetMetasBySymbol(position.symbol);
        const assetMetaNotEmpty = assetMetas.filter(assetMeta => assetMeta.investmentMemo !== null);
        investmentMemos.push(...assetMetaNotEmpty);
      }

      // 计算本周业绩（简化实现）
      const performance: WeeklyPerformance = {
        totalValue: currentPositions.reduce((sum: number, pos: PositionType) => sum + pos.marketValue, 0),
        previousValue: 0, // 简化实现
        changeAmount: 0, // 简化实现
        changePercentage: 0, // 简化实现
      };

      return {
        performance,
        transactions: weeklyTransactions,
        marketEvents,
        notes: weeklyNotes,
        investmentMemos,
      };
    } catch (error) {
      logger.error('[ReportService] 聚合本周数据失败', { error });
      throw new Error(`聚合本周数据失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 生成AI报告内容
   * @param reportData 报告数据
   * @returns 生成的报告内容（Markdown格式）
   */
  private async generateAIReportContent(reportData: WeeklyReportData): Promise<string> {
    try {
      // 构建AI提示词
      const prompt = this.buildAIPrompt(reportData);

      recordPrompt(prompt, 'report-generate-prompt.md');

      const llm = chatModelOpenAI(ModelMap['Kimi-K2-Instruct']);

      // 创建一个 Agent
      const agent = createAgent({
        model: llm,
        tools: [stockSearchNewsTool, stockRecallCompanyInfoTool, noteQueryTool, TravilySearchTool],
      });
      const messages = [
        new SystemMessage(`
你要扮演一位专业的投资顾问，根据提供的用户持仓数据、市场信息和笔记，生成一份专业的投资周报。
注意：请确保你的回答是基于提供的信息，不要包含任何个人意见，同时要关注信息的时间有效性
`),
        new HumanMessage(prompt)
      ];

      const response = await agent.invoke({
        messages,
      });

      if (response.messages) {
        const lastMessage = response.messages.at(-1);
        return lastMessage?.content as string;
      }

      return '';

    } catch (error) {
      logger.error('[ReportService] 生成AI报告内容失败', { error });
      throw new Error(`生成AI报告内容失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 构建AI提示词
   * @param reportData 报告数据
   * @returns AI提示词
   */
  private buildAIPrompt(reportData: WeeklyReportData): string {
    return `
Task: 生成本周投资周报
Context:
2. 市场关键信息: ${JSON.stringify(reportData.marketEvents)}
3. 用户笔记: ${JSON.stringify(reportData.notes)}
4. 长期逻辑: ${JSON.stringify(reportData.investmentMemos)}
5. 交易记录: ${JSON.stringify(reportData.transactions)}

Output Requirement:
- 语气专业、客观。
- 重点分析：为何涨/跌？（关联 Market Info）
- 风险提示：基于本周信息，哪些持仓面临新的风险？
- 格式：Markdown，包含以下章节：
  1. 市场与账户概览
  2. 持仓异动分析
  3. 信息与笔记回顾
  4. 下周展望与建议
`;
  }

  /**
   * 确定报告时间范围
   * @param type 报告类型
   * @param startDate 开始日期（可选）
   * @param endDate 结束日期（可选）
   * @returns 确定的时间范围
   */
  private determineDateRange(type: ReportType, startDate?: Date, endDate?: Date): { startDate: Date; endDate: Date } {
    const now = new Date();

    if (startDate && endDate) {
      return { startDate, endDate };
    }

    switch (type) {
      case 'weekly':
        // 默认本周一到周日
        const dayOfWeek = now.getDay(); // 0 (Sunday) to 6 (Saturday)
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 如果是周日，则上周一
        const start = new Date(now);
        start.setDate(now.getDate() - daysToMonday);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        return { startDate: start, endDate: end };

      case 'monthly':
        // 默认本月1号到月末
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);

        return { startDate: monthStart, endDate: monthEnd };

      default:
        // 默认本周
        return this.determineDateRange('weekly', startDate, endDate);
    }
  }

  /**
   * 生成报告标题
   * @param type 报告类型
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 报告标题
   */
  private generateReportTitle(type: ReportType, startDate: Date, endDate: Date): string {
    const startFormatted = startDate.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    });
    const endFormatted = endDate.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    });

    switch (type) {
      case 'weekly':
        return `投资周报 (${startFormatted}-${endFormatted})`;
      case 'monthly':
        return `投资月报 (${startFormatted}-${endFormatted})`;
      case 'emergency':
        return `紧急风险报告 (${startFormatted})`;
      default:
        return `投资报告 (${startFormatted}-${endFormatted})`;
    }
  }

  /**
   * 获取报告列表
   * @param accountId 账户ID
   * @param type 报告类型（可选）
   * @param limit 限制数量
   * @param offset 偏移量
   * @returns 报告列表和总数
   */
  async getReports(
    accountId: string,
    type?: ReportType,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ items: ReportListItem[]; totalCount: number }> {
    try {
      logger.info('[ReportService] 获取报告列表', { accountId, type, limit, offset });

      // 构建查询条件
      const conditions = [eq(analysisReports.accountId, parseInt(accountId))];
      if (type) {
        conditions.push(eq(analysisReports.type, type));
      }

      // 获取总数
      const [totalCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(analysisReports)
        .where(and(...conditions));

      // 获取报告列表
      const reportRows = await db.query.analysisReports.findMany({
        where: and(...conditions),
        orderBy: [desc(analysisReports.createdAt)],
        limit,
        offset,
      });

      const items: ReportListItem[] = reportRows.map(report => ({
        id: report.id.toString(),
        title: report.title,
        type: report.type as ReportType,
        startDate: report.startDate ? new Date(report.startDate) : null,
        endDate: report.endDate ? new Date(report.endDate) : null,
        createdAt: new Date(report.createdAt),
      }));

      return { items, totalCount: totalCountResult?.count || 0 };
    } catch (error) {
      logger.error('[ReportService] 获取报告列表失败', { error });
      return { items: [], totalCount: 0 };
    }
  }

  /**
   * 获取报告详情
   * @param reportId 报告ID
   * @param accountId 账户ID
   * @returns 报告详情
   */
  async getReport(reportId: string, accountId: string): Promise<ReportDetail | null> {
    try {
      logger.info('[ReportService] 获取报告详情', { reportId });

      const report = await db.query.analysisReports.findFirst({
        where: and(
          eq(analysisReports.id, parseInt(reportId)),
          eq(analysisReports.accountId, parseInt(accountId))
        ),
      });

      if (!report) {
        return null;
      }

      return {
        id: report.id.toString(),
        accountId: report.accountId.toString(),
        type: report.type as ReportType,
        title: report.title,
        content: report.content,
        startDate: report.startDate ? new Date(report.startDate) : null,
        endDate: report.endDate ? new Date(report.endDate) : null,
        createdAt: new Date(report.createdAt),
      };
    } catch (error) {
      logger.error('[ReportService] 获取报告详情失败', { reportId, error });
      return null;
    }
  }

  /**
   * 删除报告
   * @param reportId 报告ID
   * @param accountId 账户ID
   * @returns 是否删除成功
   */
  async deleteReport(reportId: string, accountId: string): Promise<boolean> {
    try {
      logger.info('[ReportService] 删除报告', { reportId, accountId });

      const result = await db
        .delete(analysisReports)
        .where(and(
          eq(analysisReports.id, parseInt(reportId)),
          eq(analysisReports.accountId, parseInt(accountId))
        ));

      return result.changes > 0;
    } catch (error) {
      logger.error('[ReportService] 删除报告失败', { reportId, error });
      return false;
    }
  }
  /**
   * 更新报告内容辅助方法
   * @param reportId 报告ID
   * @param content 报告内容
   */
  private async updateReportContent(reportId: string, content: string): Promise<void> {
    try {
      await db.update(analysisReports)
        .set({ content })
        .where(eq(analysisReports.id, parseInt(reportId)));
    } catch (error) {
      logger.error('[ReportService] 更新报告失败', { reportId, error });
      // 这里的错误我们通常选择记录但不抛出，因为不希望中断主流程（特别是异步流程中）
    }
  }
}

const reportService = new ReportService();

export default reportService;