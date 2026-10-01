/**
 * AI Insight Service
 *
 * 会话式洞察历史：定时洞察由「每日洞察」专属 Agent 的常驻会话承载，
 * 每次执行新建一个 topic（chatTopics），产出落为该 topic 的助手消息，
 * 此处按 topic 聚合供洞察历史页展示。
 */
import logger from '@server/base/logger';
import { sessionRepository, topicRepository, messageRepository } from '@server/repository/chat';
import type { ChatMessage } from '@drizzle/schema/chat';
import { AI_INSIGHT_AGENT_SLUG } from '@/shared/config/builtinAgents';
import type {
  InsightHistoryItem,
  GetInsightHistoryRequest,
  InsightHistoryListResponse,
} from '@/types/aiInsight';

export class AiInsightService {
  /**
   * 会话式洞察历史（按 topic 创建时间倒序分页）
   */
  async getInsightHistory(
    userId: number,
    request: GetInsightHistoryRequest,
  ): Promise<InsightHistoryListResponse> {
    const { page = 1, pageSize = 20 } = request;

    try {
      // 1.「每日洞察」Agent 的常驻会话（通常一条）
      const agentSessions = await sessionRepository.findByUserIdAndAgentId(
        userId,
        AI_INSIGHT_AGENT_SLUG,
      );
      if (agentSessions.length === 0) {
        return { items: [], totalCount: 0, totalPages: 0, currentPage: page };
      }

      // 2. 汇总会话下的洞察 topic，按创建时间倒序
      const topics = (
        await Promise.all(agentSessions.map((s) => topicRepository.findBySessionId(s.id)))
      ).flat();
      topics.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // topic 为全量拉取，其数量即准确计数
      const totalCount = topics.length;
      const totalPages = Math.ceil(totalCount / pageSize);
      const paginated = topics.slice((page - 1) * pageSize, page * pageSize);

      let items: InsightHistoryItem[] = [];
      if (paginated.length > 0) {
        const messages = await messageRepository.findAssistantMessagesByTopicIds(
          paginated.map((t) => t.id),
        );

        // messages 按 createdAt 升序，每个 topic 取最后一条助手消息作为产出
        const latestAssistantByTopic = new Map<string, ChatMessage>();
        for (const msg of messages) {
          if (msg.topicId) {
            latestAssistantByTopic.set(msg.topicId, msg);
          }
        }

        items = paginated.map((topic) => ({
          id: topic.id,
          sessionId: topic.sessionId,
          topicId: topic.id,
          accountId: null,
          jobId: null,
          title: topic.title || '洞察',
          description: latestAssistantByTopic.get(topic.id)?.content ?? '',
          type: 'agent',
          confidence: null,
          source: 'agent',
          createdAt: topic.createdAt.toISOString(),
        }));
      }

      return { items, totalCount, totalPages, currentPage: page };
    } catch (error) {
      logger.error(`[AiInsightService] Failed to load insight history for user ${userId}: ${error}`);
      return { items: [], totalCount: 0, totalPages: 0, currentPage: page };
    }
  }
}

export default new AiInsightService();
