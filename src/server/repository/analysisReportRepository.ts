/**
 * Analysis Report Repository
 *
 * 数据访问层：负责 analysis_reports 表的数据库操作
 */
import { db } from '@server/lib/db';
import { analysisReports } from '@/drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { BaseIntRepository } from './base';

/**
 * Analysis Report 实体类型
 */
export type AnalysisReportEntity = typeof analysisReports.$inferSelect;

/**
 * 创建报告数据类型
 */
export type CreateReportData = Omit<AnalysisReportEntity, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * 更新报告数据类型
 */
export type UpdateReportData = Partial<Omit<AnalysisReportEntity, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * 创建报告请求类型（简化版，只需要必填字段）
 */
export type CreateReportRequest = {
  accountId: number;
  type: string;
  title: string;
  content: string;
  startDate?: Date | null;
  endDate?: Date | null;
};

/**
 * Analysis Report Repository
 * 管理分析报告数据
 */
export class AnalysisReportRepository extends BaseIntRepository<AnalysisReportEntity> {
  constructor() {
    super(analysisReports);
  }

  /**
   * 创建新报告（简化版，自动填充默认值）
   */
  async createReport(data: CreateReportRequest): Promise<AnalysisReportEntity> {
    const now = new Date();
    const [result] = await (db as any)
      .insert(analysisReports)
      .values({
        ...data,
        startDate: data.startDate ?? null,
        endDate: data.endDate ?? null,
        generationProgress: 0,
        generationStage: null,
        dataSourceSummary: null,
        isManuallyEdited: false,
        lastEditedAt: null,
        editCount: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return result as AnalysisReportEntity;
  }

  /**
   * 根据账户 ID 查找所有报告
   */
  async findByAccountId(
    accountId: number,
    limit?: number,
    offset?: number,
  ): Promise<AnalysisReportEntity[]> {
    return this.findMany(eq(analysisReports.accountId, accountId), {
      orderBy: [desc(analysisReports.createdAt)],
      limit,
      offset,
    });
  }

  /**
   * 根据账户 ID 和类型查找报告
   */
  async findByAccountIdAndType(
    accountId: number,
    type: string,
    limit?: number,
    offset?: number,
  ): Promise<AnalysisReportEntity[]> {
    return this.findMany(
      and(eq(analysisReports.accountId, accountId), eq(analysisReports.type, type))!,
      {
        orderBy: [desc(analysisReports.createdAt)],
        limit,
        offset,
      },
    );
  }

  /**
   * 根据账户 ID 和报告 ID 查找报告（用于权限验证）
   */
  async findByIdAndAccountId(
    reportId: number,
    accountId: number,
  ): Promise<AnalysisReportEntity | null> {
    return this.findOne(
      and(eq(analysisReports.id, reportId), eq(analysisReports.accountId, accountId))!,
    );
  }

  /**
   * 统计账户的报告数量
   */
  async countByAccountId(accountId: number): Promise<number> {
    return this.count(eq(analysisReports.accountId, accountId));
  }

  /**
   * 统计账户指定类型的报告数量
   */
  async countByAccountIdAndType(accountId: number, type: string): Promise<number> {
    return this.count(and(eq(analysisReports.accountId, accountId), eq(analysisReports.type, type))!);
  }

  /**
   * 更新报告生成进度
   */
  async updateProgress(
    reportId: number,
    progress: number,
    stage: string,
  ): Promise<AnalysisReportEntity | null> {
    return this.update(reportId, {
      generationProgress: progress,
      generationStage: stage,
    });
  }

  /**
   * 更新报告内容
   */
  async updateContent(
    reportId: number,
    content: string,
    dataSourceSummary?: string,
  ): Promise<AnalysisReportEntity | null> {
    const updateData: UpdateReportData = {
      content,
      generationProgress: 100,
      generationStage: '已完成',
    };
    
    if (dataSourceSummary !== undefined) {
      updateData.dataSourceSummary = dataSourceSummary;
    }
    
    return this.update(reportId, updateData);
  }

  /**
   * 标记报告生成失败
   */
  async markFailed(reportId: number, errorMessage: string): Promise<AnalysisReportEntity | null> {
    return this.update(reportId, {
      content: errorMessage,
      generationProgress: 0,
      generationStage: '生成失败',
    });
  }

  /**
   * 删除账户的所有报告
   */
  async deleteByAccountId(accountId: number): Promise<void> {
    return this.deleteWhere(eq(analysisReports.accountId, accountId));
  }

  /**
   * 验证报告是否属于指定账户
   */
  async verifyOwnership(reportId: number, accountId: number): Promise<boolean> {
    return this.exists(
      and(eq(analysisReports.id, reportId), eq(analysisReports.accountId, accountId))!,
    );
  }
}

// 导出单例实例
export const analysisReportRepository = new AnalysisReportRepository();
