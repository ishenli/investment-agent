/**
 * AI Insight - Shared Types
 *
 * 会话式洞察历史的前后端共享类型。
 * 定时洞察由「每日洞察」专属 Agent 的常驻会话承载，每次执行产生一个 topic
 * （chatTopics + chatMessages），每次 AI 洞察产出均可跳转回会话查看完整上下文。
 */

export interface InsightHistoryItem {
  /** topic ID，即洞察记录 ID */
  id: string;
  /** 承载该洞察的「每日洞察」Agent 常驻会话 ID，用于跳转回看 */
  sessionId: string;
  /** 洞察对应的 topic ID */
  topicId: string;
  accountId: number | null;
  jobId: number | null;
  title: string;
  description: string;
  /** 会话式产出，无结构化分类 */
  type: 'agent';
  confidence: null;
  source: 'agent';
  createdAt: string;
}

export interface GetInsightHistoryRequest {
  page?: number;
  pageSize?: number;
}

export interface InsightHistoryListResponse {
  items: InsightHistoryItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

// ============== Constants ==============

/** 会话式洞察执行会话的 slug 前缀：scheduled-insight-<jobId>-<nanoid> */
export const SCHEDULED_INSIGHT_SLUG_PREFIX = 'scheduled-insight-';
