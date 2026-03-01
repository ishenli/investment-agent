import { LobeSessions } from '@typings/session/agentSession';
import { LobeSessionGroups, SessionGroupId } from '@typings/session/sessionGroup';
import { LobeAgentConfig } from '@typings/agent';

export * from './agentSession';
export * from './sessionGroup';

export interface ChatSessionList {
  sessionGroups: LobeSessionGroups;
  sessions: LobeSessions;
}

export interface UpdateSessionParams {
  config?: Partial<LobeAgentConfig>;
  group?: SessionGroupId;
  meta?: any;
  pinned?: boolean;
  updatedAt?: Date;
}

export interface SessionRankItem {
  avatar: string | null;
  backgroundColor: string | null;
  count: number;
  id: string;
  title: string | null;
}
