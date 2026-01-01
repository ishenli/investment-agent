import type { PartialDeep } from 'type-fest';

import {
  DEFAULT_SESSION_INIT_CONFIG,
  INBOX_SESSION_ID,
  SESSION_CONFIG_MAP,
  SessionCreateConfig,
  SessionInitConfig,
} from '@renderer/const/session';
import { SessionModel } from '@renderer/database/models/session';
import { SessionGroupModel } from '@renderer/database/models/sessionGroup';
import { LobeAgentChatConfig, LobeAgentConfig } from '@typings/agent';
import { MetaData } from '@typings/meta';
import {
  ChatSessionList,
  LobeAgentSession,
  LobeSessionType,
  LobeSessions,
  SessionGroupItem,
  SessionGroups,
} from '@typings/session';
import { merge } from '@renderer/lib/merge';
import { get } from '@/app/lib/request/index';
import { AgentTypeResponse as Agent } from '@typings/agent';
import { ISessionService } from './type';

export class ClientService implements ISessionService {
  async createSession(
    type: LobeSessionType,
    defaultValue: Partial<LobeAgentSession>,
  ): Promise<string> {
    const item = await SessionModel.create(type, defaultValue);
    if (!item) {
      throw new Error('session create Error');
    }
    return item.id;
  }

  async batchCreateSessions(importSessions: LobeSessions) {
    return SessionModel.batchCreate(importSessions);
  }

  async cloneSession(id: string, newTitle: string): Promise<string | undefined> {
    const res = await SessionModel.duplicate(id, newTitle);

    if (res) return res?.id;
  }

  async getGroupedSessions(): Promise<ChatSessionList> {
    return SessionModel.queryWithGroups();
  }

  async getSessionConfig(id: string): Promise<LobeAgentConfig> {
    if (!id || id === INBOX_SESSION_ID) {
      return (await SessionModel.findBySlug(INBOX_SESSION_ID))?.config as LobeAgentConfig;
    }

    const res = await SessionModel.findById(id);

    if (!res) throw new Error('Session not found');

    return res.config as LobeAgentConfig;
  }

  async getSessionsByType(type: 'agent' | 'group' | 'all' = 'all'): Promise<LobeSessions> {
    switch (type) {
      // TODO: add a filter to get only agents or agents
      case 'group': {
        return SessionModel.query();
      }
      case 'agent': {
        return SessionModel.query();
      }

      case 'all': {
        return SessionModel.query();
      }
    }
  }

  async getAllAgents(): Promise<LobeSessions> {
    // TODO: add a filter to get only agents
    return SessionModel.query();
  }

  async countSessions() {
    return SessionModel.count();
  }

  // @ts-ignore
  async rankSessions() {
    throw new Error('Method not implemented.');
  }

  async hasSessions() {
    return (await this.countSessions()) !== 0;
  }

  async searchSessions(keyword: string) {
    return SessionModel.queryByKeyword(keyword);
  }

  async updateSession(
    id: string,
    data: Partial<Pick<LobeAgentSession, 'group' | 'meta' | 'pinned' | 'updatedAt'>>,
  ) {
    const pinned = typeof data.pinned === 'boolean' ? (data.pinned ? 1 : 0) : undefined;
    const prev = await SessionModel.findById(id);

    return SessionModel.update(id, merge(prev, { ...data, pinned }));
  }

  async updateSessionConfig(
    activeId: string,
    config: PartialDeep<LobeAgentConfig>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _?: AbortSignal,
  ) {
    if (activeId === INBOX_SESSION_ID) {
      const activeSession = await SessionModel.findBySlug(INBOX_SESSION_ID);
      if (!activeSession) return;
      return SessionModel.updateConfig(activeSession.id, config);
    }
    return SessionModel.updateConfig(activeId, config);
  }

  async updateSessionMeta(
    activeId: string,
    meta: Partial<MetaData>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _?: AbortSignal,
  ) {
    // inbox 不允许修改 meta
    if (activeId === INBOX_SESSION_ID) return;

    return SessionModel.update(activeId, { meta });
  }

  async updateSessionChatConfig(
    activeId: string,
    config: PartialDeep<LobeAgentChatConfig>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _?: AbortSignal,
  ) {
    return this.updateSessionConfig(activeId, { chatConfig: config });
  }

  async removeSession(id: string) {
    return SessionModel.delete(id);
  }

  async removeAllSessions() {
    return SessionModel.clearTable();
  }

  // ************************************** //
  // ***********  SessionGroup  *********** //
  // ************************************** //

  async createSessionGroup(name: string, sort?: number) {
    const item = await SessionGroupModel.create(name, sort);
    if (!item) {
      throw new Error('session group create Error');
    }

    return item.id;
  }

  async batchCreateSessionGroups(groups: SessionGroups) {
    return SessionGroupModel.batchCreate(groups);
  }

  async removeSessionGroup(id: string, removeChildren?: boolean) {
    return SessionGroupModel.delete(id, removeChildren);
  }

  async updateSessionGroup(id: string, data: Partial<SessionGroupItem>) {
    return SessionGroupModel.update(id, data as any);
  }

  async updateSessionGroupOrder(sortMap: { id: string; sort: number }[]) {
    return SessionGroupModel.updateOrder(sortMap);
  }

  async getSessionGroups(): Promise<SessionGroupItem[]> {
    return SessionGroupModel.query();
  }

  async removeSessionGroups() {
    return SessionGroupModel.clear();
  }

  async initSessionConfig(config: SessionInitConfig = DEFAULT_SESSION_INIT_CONFIG) {
    const promises: Promise<any>[] = [];

    // 遍历配置映射，按 map 键读取初始化配置
    Object.entries(SESSION_CONFIG_MAP).forEach(
      ([id, { sessionConfig, agentConfig: defaultAgentConfig }]) => {
        const init = config[id as keyof SessionInitConfig];
        if (init?.enabled) {
          const agentConfig = init.config || defaultAgentConfig;
          promises.push(
            SessionModel.createSessionByConfig(
              sessionConfig,
              agentConfig as Partial<LobeAgentConfig>,
            ),
          );
        }
      },
    );

    // // 获取自定义的智能体
    // const response: { success: boolean; data: Agent[] } = await get('/api/agent');
    // if (response.success) {
    //   response.data.forEach((agent) => {
    //     const sessionConfig: SessionCreateConfig = {
    //       slug: agent.slug || '',
    //       title: agent.name || '',
    //       description: agent.description || '',
    //       avatar: agent.logo || undefined,
    //       agentId: String(agent.id),
    //     };

    //     const agentConfig = {
    //       openingQuestions: agent.openingQuestions || [],
    //     };
    //     promises.push(SessionModel.createSessionByConfig(sessionConfig, agentConfig));
    //   });
    // }

    // 并行执行所有创建操作
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }
}
