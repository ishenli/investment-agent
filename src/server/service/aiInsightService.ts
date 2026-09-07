/**
 * AI Insight Service
 *
 * 处理 AI 洞察的持久化和查询业务逻辑
 */
import logger from '@server/base/logger';
import { aiInsightRepository } from '@server/repository/aiInsightRepository';
import { sessionRepository, messageRepository } from '@server/repository/chat';
import type { ChatMessage } from '@drizzle/schema/chat';
import type {
  AiInsightEntity,
  AiInsightResponse,
  AiInsightListResponse,
  GetAiInsightsRequest,
  CreateAiInsightInput,
  InsightSource,
  InsightHistoryItem,
  GetInsightHistoryRequest,
  InsightHistoryListResponse,
} from '@/types/aiInsight';
import type { AIInsight } from '@renderer/store/position/aiInsightsTypes';

/** 历史聚合时单侧记录的最大拉取数量（个人场景足够） */
const HISTORY_FETCH_CAP = 500;

/** 旧结构 ai_insights 记录 → 统一历史条目 */
function toHistoryItemFromLegacy(entity: AiInsightEntity): InsightHistoryItem {
  return {
    id: String(entity.id),
    accountId: entity.accountId,
    jobId: entity.jobId,
    title: entity.title,
    description: entity.description,
    type: entity.type,
    confidence: entity.confidence,
    source: entity.source,
    createdAt: entity.createdAt.toISOString(),
  };
}

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
  /**
   * 清理旧的定时洞察残留（source='scheduled'）
   *
   * 会话式切换后，旧结构定时洞察不再新增；此处仅删除历史 source='scheduled'
   * 记录，保留手动生成与新的会话式产出。
   */
  async cleanLegacyScheduledInsights(userId: number): Promise<number> {
    const deleted = await aiInsightRepository.deleteByUserIdAndSource(userId, 'scheduled');
    logger.info(`[AiInsightService] Cleaned ${deleted} legacy scheduled insights for user ${userId}`);
    return deleted;
  }

  async getInsightsByJobId(jobId: number): Promise<AiInsightResponse[]> {
    try {
      const items = await aiInsightRepository.findByJobId(jobId);
      return items.map(toResponse);
    } catch (error) {
      logger.error(`[AiInsightService] Failed to get insights for job ${jobId}: ${error}`);
      return [];
    }
  }

  /**
   * 聚合洞察历史（会话式切换后新旧两类记录）
   *
   * - 旧记录：来自 ai_insights 表（source=manual/scheduled），只读保留。
   * - 新记录：来自会话式洞察执行（source=agent），存于 chatSessions（slug 前缀
   *   scheduled-insight-）与 chatMessages 助手消息。
   *
   * 两条路径互不覆盖，按时间倒序聚合分页返回。
   */
  async getInsightHistory(
    userId: number,
    request: GetInsightHistoryRequest,
  ): Promise<InsightHistoryListResponse> {
    const { page = 1, pageSize = 20, source, type } = request;

    const items: InsightHistoryItem[] = [];
    let legacyTotal = 0;
    let sessionTotal = 0;

    // 1. 旧结构 ai_insights 记录
    const wantsLegacy =
      (!source || source === 'manual' || source === 'scheduled') &&
      (!type || type === 'opportunity' || type === 'risk' || type === 'suggestion');

    if (wantsLegacy) {
      const legacyResult = await aiInsightRepository.findByUserId(userId, {
        page: 1,
        pageSize: HISTORY_FETCH_CAP,
        source: source as InsightSource | undefined,
        type: type as 'opportunity' | 'risk' | 'suggestion' | undefined,
      });
      // 仓储 totalCount 来自独立 count 查询，不受 pageSize 拉取上限影响
      legacyTotal = legacyResult.totalCount;
      for (const entity of legacyResult.items) {
        items.push(toHistoryItemFromLegacy(entity));
      }
    }

    // 2. 会话式新记录
    const wantsSession = (!source || source === 'agent') && (!type || type === 'agent');

    if (wantsSession) {
      try {
        const sessions = await sessionRepository.findScheduledInsightSessionsByUserId(userId);
        // 会话记录为全量拉取，其数量即准确计数
        sessionTotal = sessions.length;

        if (sessions.length > 0) {
          const messages = await messageRepository.findAssistantMessagesBySessionIds(
            sessions.map((s) => s.id),
          );

          // messages 按 createdAt 升序，取每个会话最后一条助手消息作为产出
          const latestAssistantBySession = new Map<string, ChatMessage>();
          for (const msg of messages) {
            latestAssistantBySession.set(msg.sessionId, msg);
          }

          for (const session of sessions) {
            const assistantMsg = latestAssistantBySession.get(session.id);
            const jobIdMatch = session.slug.match(/^scheduled-insight-(\d+)-/);

            items.push({
              id: session.id,
              sessionId: session.id,
              accountId: null,
              jobId: jobIdMatch ? parseInt(jobIdMatch[1], 10) : null,
              title: session.meta?.title || '洞察',
              description: assistantMsg?.content ?? '',
              type: 'agent',
              confidence: null,
              source: 'agent',
              createdAt: session.createdAt.toISOString(),
            });
          }
        }
      } catch (error) {
        logger.error(`[AiInsightService] Failed to load session insights for user ${userId}: ${error}`);
      }
    }

    // 3. 按时间倒序聚合排序 + 分页（totalCount 用两侧真实计数，避免拉取上限导致低估）
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const totalCount = legacyTotal + sessionTotal;
    const start = (page - 1) * pageSize;

    return {
      items: items.slice(start, start + pageSize),
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      currentPage: page,
    };
  }
}

export default new AiInsightService();
