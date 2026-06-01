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

// ============== Constants ==============

export const INSIGHT_TYPES: InsightType[] = ['opportunity', 'risk', 'suggestion'];

export const INSIGHT_SOURCES: InsightSource[] = ['manual', 'scheduled'];
