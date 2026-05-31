/**
 * AI Insight Service
 *
 * 处理 AI 洞察的持久化和查询业务逻辑
 */
import logger from '@server/base/logger';
import { aiInsightRepository } from '@server/repository/aiInsightRepository';
import type {
  AiInsightEntity,
  AiInsightResponse,
  AiInsightListResponse,
  GetAiInsightsRequest,
  CreateAiInsightInput,
  InsightSource,
} from '@/types/aiInsight';
import type { AIInsight } from '@renderer/store/position/aiInsightsTypes';

function toResponse(entity: AiInsightEntity): AiInsightResponse {
  return {
    id: entity.id,
    userId: entity.userId,
    accountId: entity.accountId,
    jobId: entity.jobId,
    title: entity.title,
    description: entity.description,
    type: entity.type,
    confidence: entity.confidence,
    metadata: entity.metadata,
    source: entity.source,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

export class AiInsightService {
  /**
   * 将 AI 生成的洞察批量持久化到数据库
   * @param userId 用户 ID
   * @param accountId 关联账户 ID
   * @param jobId 关联定时任务 ID（手动生成时为 null）
   * @param insights AIInsightsService 返回的洞察数组
   * @param source 来源标记
   * @returns 创建的洞察 ID 列表
   */
  async createInsights(
    userId: number,
    accountId: number | null,
    jobId: number | null,
    insights: AIInsight[],
    source: InsightSource = 'scheduled',
  ): Promise<number[]> {
    try {
      const inputs: CreateAiInsightInput[] = insights.map((insight) => ({
        userId,
        accountId,
        jobId,
        title: insight.title,
        description: insight.description,
        type: insight.type as CreateAiInsightInput['type'],
        confidence: insight.confidence ?? null,
        metadata: insight.metadata ? (insight.metadata as Record<string, unknown>) : null,
        source,
      }));

      const ids = await aiInsightRepository.createMany(inputs);
      logger.info(`[AiInsightService] Persisted ${ids.length} insights for user ${userId}, job ${jobId}`);
      return ids;
    } catch (error) {
      logger.error(`[AiInsightService] Failed to persist insights: ${error}`);
      throw error;
    }
  }

  /**
   * 获取洞察列表（分页 + 筛选）
   */
  async getInsights(userId: number, request: GetAiInsightsRequest): Promise<AiInsightListResponse> {
    try {
      const page = request.page ?? 1;
      const pageSize = request.pageSize ?? 20;

      const { items, totalCount } = await aiInsightRepository.findByUserId(userId, {
        page,
        pageSize,
        source: request.source,
        type: request.type,
        accountId: request.accountId,
      });

      return {
        items: items.map(toResponse),
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        currentPage: page,
      };
    } catch (error) {
      logger.error(`[AiInsightService] Failed to get insights for user ${userId}: ${error}`);
      return { items: [], totalCount: 0, totalPages: 0, currentPage: 1 };
    }
  }

  /**
   * 根据 ID 获取单条洞察
   */
  async getInsightById(id: number): Promise<AiInsightResponse | null> {
    try {
      const entity = await aiInsightRepository.findById(id);
      return entity ? toResponse(entity) : null;
    } catch (error) {
      logger.error(`[AiInsightService] Failed to get insight ${id}: ${error}`);
      return null;
    }
  }

  /**
   * 根据任务 ID 获取洞察列表
   */
  async getInsightsByJobId(jobId: number): Promise<AiInsightResponse[]> {
    try {
      const items = await aiInsightRepository.findByJobId(jobId);
      return items.map(toResponse);
    } catch (error) {
      logger.error(`[AiInsightService] Failed to get insights for job ${jobId}: ${error}`);
      return [];
    }
  }
}

export default new AiInsightService();
