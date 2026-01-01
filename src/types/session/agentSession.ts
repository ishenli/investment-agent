import { LobeAgentConfig } from '@typings/agent';

import { MetaData } from '../meta';
import { SessionGroupId } from './sessionGroup';

export enum LobeSessionType {
  Agent = 'agent',
  Group = 'group',
}

/**
 * Lobe Agent
 */
export interface LobeAgentSession {
  config: LobeAgentConfig;
  createdAt: Date;
  group?: SessionGroupId;
  id: string;
  meta: MetaData;
  model: string;
  pinned?: boolean;
  slug?: string;
  tags?: string[];
  type: LobeSessionType.Agent;
  updatedAt: Date;
  agentId: string;
}

export interface LobeAgentSettings {
  /**
   * 语言模型角色设定
   */
  config: LobeAgentConfig;
  meta: MetaData;
}

export type LobeSessions = LobeAgentSession[];
