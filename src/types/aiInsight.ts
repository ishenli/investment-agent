/**
 * AI Insight - Shared Types
 *
 * AI 洞察持久化的共享类型定义，前后端通用。
 */

// ============== Enums / Unions ==============

export type InsightType = 'opportunity' | 'risk' | 'suggestion';

export type InsightSource = 'manual' | 'scheduled';

// ============== Entity ==============

export interface AiInsightEntity {
  id: number;
  userId: number;
  accountId: number | null;
  jobId: number | null;
  title: string;
  description: string;
  type: InsightType;
  confidence: number | null;
  metadata: Record<string, unknown> | null;
  source: InsightSource;
  createdAt: Date;
  updatedAt: Date;
}

// ============== Response ==============

export interface AiInsightResponse {
  id: number;
  userId: number;
  accountId: number | null;
  jobId: number | null;
  title: string;
  description: string;
  type: InsightType;
  confidence: number | null;
  metadata: Record<string, unknown> | null;
  source: InsightSource;
  createdAt: string;
  updatedAt: string;
}

// ============== Input Types ==============

export interface CreateAiInsightInput {
  userId: number;
  accountId?: number | null;
  jobId?: number | null;
  title: string;
  description: string;
  type: InsightType;
  confidence?: number | null;
  metadata?: Record<string, unknown> | null;
  source: InsightSource;
}

// ============== Filter / Query Types ==============

export interface AiInsightFilters {
  source?: InsightSource;
  type?: InsightType;
  accountId?: number;
}

export interface GetAiInsightsRequest {
  page?: number;
  pageSize?: number;
  source?: InsightSource;
  type?: InsightType;
  accountId?: number;
}

export interface AiInsightListResponse {
  items: AiInsightResponse[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

// ============== History (聚合展示) ==============

/**
 * 会话式洞察历史来源标记：'agent' 表示由会话式定时任务执行产生（存于 chatSessions/chatMessages）。
 */
export type InsightHistorySource = InsightSource | 'agent';

/**
 * 会话式洞察历史类型：'agent' 表示会话式产出（无结构化分类）。
 */
export type InsightHistoryType = InsightType | 'agent';

export interface InsightHistoryItem {
  /** 统一 ID（旧记录为 ai_insights.id 转字符串；新会话式记录为 sessionId） */
  id: string;
  /** 会话式新记录对应的会话 ID，用于跳转回看；旧记录无此字段 */
  sessionId?: string;
  accountId: number | null;
  jobId: number | null;
  title: string;
  description: string;
  type: InsightHistoryType;
  confidence: number | null;
  source: InsightHistorySource;
  createdAt: string;
}

export interface GetInsightHistoryRequest {
  page?: number;
  pageSize?: number;
  source?: InsightHistorySource;
  type?: InsightHistoryType;
}

export interface InsightHistoryListResponse {
  items: InsightHistoryItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

// ============== Constants ==============

export const INSIGHT_TYPES: InsightType[] = ['opportunity', 'risk', 'suggestion'];

export const INSIGHT_SOURCES: InsightSource[] = ['manual', 'scheduled'];

/** 会话式洞察执行会话的 slug 前缀：scheduled-insight-<jobId>-<timestamp> */
export const SCHEDULED_INSIGHT_SLUG_PREFIX = 'scheduled-insight-';
