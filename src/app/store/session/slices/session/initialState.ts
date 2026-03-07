import { INBOX_SESSION_ID } from '@/app/const/session';
import { DEFAULT_AGENT_CONFIG } from '@renderer/const/settings';
import { LobeAgentConfig } from '@typings/agent';
import { LobeAgentSession } from '@typings/session';
import type { PartialDeep } from 'type-fest';

export interface SessionState {
  /**
   * @title 当前活动的会话
   * @description 当前正在编辑或查看的会话
   */
  activeId: string;
  defaultSessions: LobeAgentSession[];
  isSearching: boolean;
  isSessionsFirstFetchFinished: boolean;
  pinnedSessions: LobeAgentSession[];
  searchKeywords: string;
  sessionSearchKeywords?: string;
  /**
   * it means defaultSessions
   */
  sessions: LobeAgentSession[];
  signalSessionMeta?: AbortController;

  // ─────────────────────────────────────────────
  // Migrated from AgentStore
  // ─────────────────────────────────────────────
  /** 当前活跃的 Agent ID（通过 useFetchAgentConfig 写入） */
  activeAgentId?: string;
  /** 每个 sessionId → LobeAgentConfig 的乐观更新缓存 */
  agentMap: Record<string, PartialDeep<LobeAgentConfig>>;
  /** 每个 sessionId 是否已完成首次 config 加载 */
  agentConfigInitMap: Record<string, boolean>;
  /** 全局默认 agent 配置（合并基准） */
  defaultAgentConfig: LobeAgentConfig;
  /** Inbox agent config 是否已初始化 */
  isInboxAgentConfigInit: boolean;
  /** AbortController：防止 updateAgentConfig 并发写入 */
  updateAgentConfigSignal?: AbortController;
  updateAgentChatConfigSignal?: AbortController;
}

export const initialSessionState: SessionState = {
  activeId: INBOX_SESSION_ID,
  defaultSessions: [],
  isSearching: false,
  isSessionsFirstFetchFinished: false,
  pinnedSessions: [],
  searchKeywords: '',
  sessions: [],
  // Migrated from AgentStore
  agentMap: {},
  agentConfigInitMap: {},
  defaultAgentConfig: DEFAULT_AGENT_CONFIG,
  isInboxAgentConfigInit: false,
};
