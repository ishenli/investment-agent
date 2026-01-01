import { SessionInitConfig } from '@renderer/const/session';
import { LobeAgentChatConfig, LobeAgentConfig } from '@typings/agent';
import { MetaData } from '@typings/meta';
import {
  ChatSessionList,
  LobeAgentSession,
  LobeSessions,
  LobeSessionType,
  SessionGroupItem,
  SessionRankItem,
  UpdateSessionParams,
} from '@typings/session';

export interface ISessionService {
  hasSessions(): Promise<boolean>;
  createSession(type: LobeSessionType, defaultValue: Partial<LobeAgentSession>): Promise<string>;

  /**
   * 需要废弃
   * @deprecated
   */
  batchCreateSessions(importSessions: LobeSessions): Promise<any>;
  cloneSession(id: string, newTitle: string): Promise<string | undefined>;

  getGroupedSessions(): Promise<ChatSessionList>;

  /**
   * @deprecated
   */
  getSessionsByType(type?: 'agent' | 'group' | 'all'): Promise<LobeSessions>;
  countSessions(params?: {
    endDate?: string;
    range?: [string, string];
    startDate?: string;
  }): Promise<number>;
  rankSessions(limit?: number): Promise<SessionRankItem[]>;
  searchSessions(keyword: string): Promise<LobeSessions>;

  updateSession(id: string, data: Partial<UpdateSessionParams>): Promise<any>;

  getSessionConfig(id: string): Promise<LobeAgentConfig>;
  updateSessionConfig(
    id: string,
    config: Partial<LobeAgentConfig>,
    signal?: AbortSignal,
  ): Promise<any>;

  updateSessionMeta(id: string, meta: Partial<MetaData>, signal?: AbortSignal): Promise<any>;

  updateSessionChatConfig(
    id: string,
    config: Partial<LobeAgentChatConfig>,
    signal?: AbortSignal,
  ): Promise<any>;

  removeSession(id: string): Promise<any>;
  removeAllSessions(): Promise<any>;

  /**
   * 初始化会话配置
   * @param config 初始化配置选项
   */
  initSessionConfig(config?: SessionInitConfig): Promise<void>;

  // ************************************** //
  // ***********  SessionGroup  *********** //
  // ************************************** //

  createSessionGroup(name: string, sort?: number): Promise<string>;

  getSessionGroups(): Promise<SessionGroupItem[]>;

  updateSessionGroup(id: string, data: Partial<SessionGroupItem>): Promise<any>;
  updateSessionGroupOrder(sortMap: { id: string; sort: number }[]): Promise<any>;

  removeSessionGroup(id: string, removeChildren?: boolean): Promise<any>;
  removeSessionGroups(): Promise<any>;
}
