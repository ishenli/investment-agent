/**
 * Session Server Service
 *
 * 服务端 Session 服务，通过 API 调用后端接口
 */
import type { PartialDeep } from 'type-fest';

import {
  DEFAULT_SESSION_INIT_CONFIG,
  INBOX_SESSION_ID,
  SESSION_CONFIG_MAP,
  SessionInitConfig,
} from '@renderer/const/session';
import { LobeAgentChatConfig, LobeAgentConfig } from '@typings/agent';
import { MetaData } from '@typings/meta';
import {
  ChatSessionList,
  LobeAgentSession,
  LobeSessionType,
  LobeSessions,
  SessionGroupItem,
} from '@typings/session';

import { ISessionService } from './type';

// API response type
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  return response.json();
}

/**
 * 模块级 inflight 请求合并：当多个调用方并发请求同一读接口时，
 * 共享同一个进行中的 Promise，避免重复网络请求。
 * 完成后清除，下次调用仍可发起新请求。
 */
let _inflightSessionsRequest: Promise<ApiResponse<{ sessions: LobeAgentSession[] }>> | null = null;

function fetchAllSessions(): Promise<ApiResponse<{ sessions: LobeAgentSession[] }>> {
  if (_inflightSessionsRequest) {
    return _inflightSessionsRequest;
  }
  _inflightSessionsRequest = request<{ sessions: LobeAgentSession[] }>('/api/chat/sessions').finally(
    () => {
      _inflightSessionsRequest = null;
    },
  );
  return _inflightSessionsRequest;
}

/**
 * 模块级 inflight 锁：防止 initSessionConfig 并发执行
 * 主要防御 React StrictMode 双重触发、快速路由切换等场景下的重复 POST 请求
 */
let _inflightInitSessionConfig: Promise<void> | null = null;

export class ServerService implements ISessionService {
  async createSession(
    type: LobeSessionType,
    defaultValue: Partial<LobeAgentSession>,
  ): Promise<string> {
    const res = await request<{ id: string; message: string }>('/api/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({
        slug: defaultValue.slug || Date.now().toString(),
        type,
        groupId: defaultValue.group,
        pinned: defaultValue.pinned,
        config: defaultValue.config || {},
        meta: defaultValue.meta || { title: 'New Session' },
        agentId: defaultValue.agentId,
      }),
    });

    if (!res.success) {
      throw new Error(res.error || '创建会话失败');
    }

    return res.data!.id;
  }

  async batchCreateSessions(_importSessions: LobeSessions): Promise<any> {
    throw new Error('batchCreateSessions not implemented for server');
  }

  async cloneSession(_id: string, _newTitle: string): Promise<string | undefined> {
    throw new Error('cloneSession not implemented for server');
  }

  async getGroupedSessions(): Promise<ChatSessionList> {
    const res = await fetchAllSessions();

    if (!res.success) {
      throw new Error(res.error || '获取会话列表失败');
    }

    const sessions = res.data!.sessions || [];

    return {
      sessionGroups: [],
      sessions,
    };
  }

  async getSessionConfig(id: string): Promise<LobeAgentConfig> {
    const res = await request<{ session: LobeAgentSession }>(`/api/chat/sessions?id=${id}`);

    if (!res.success) {
      throw new Error(res.error || '获取会话配置失败');
    }

    return res.data!.session.config as LobeAgentConfig;
  }

  async getSessionsByType(_type: 'agent' | 'group' | 'all' = 'all'): Promise<LobeSessions> {
    const res = await fetchAllSessions();

    if (!res.success) {
      throw new Error(res.error || '获取会话列表失败');
    }

    return res.data!.sessions || [];
  }

  async countSessions(): Promise<number> {
    const res = await fetchAllSessions();

    if (!res.success) {
      return 0;
    }

    return res.data!.sessions?.length || 0;
  }

  async rankSessions(): Promise<any> {
    throw new Error('rankSessions not implemented for server');
  }

  async hasSessions(): Promise<boolean> {
    const count = await this.countSessions();
    return count > 0;
  }

  async searchSessions(_keyword: string): Promise<LobeSessions> {
    throw new Error('searchSessions not implemented for server');
  }

  async updateSession(
    id: string,
    data: Partial<Pick<LobeAgentSession, 'group' | 'meta' | 'pinned' | 'updatedAt'>>,
  ): Promise<any> {
    const res = await request('/api/chat/sessions', {
      method: 'PUT',
      body: JSON.stringify({
        id,
        groupId: data.group,
        pinned: data.pinned,
        meta: data.meta,
      }),
    });

    if (!res.success) {
      throw new Error(res.error || '更新会话失败');
    }
  }

  async updateSessionConfig(
    activeId: string,
    config: PartialDeep<LobeAgentConfig>,
    _?: AbortSignal,
  ): Promise<any> {

    const res = await request('/api/chat/sessions', {
      method: 'PUT',
      body: JSON.stringify({
        id: activeId,
        config,
      }),
    });

    if (!res.success) {
      throw new Error(res.error || '更新会话配置失败');
    }
  }

  async updateSessionMeta(
    activeId: string,
    meta: Partial<MetaData>,
    _?: AbortSignal,
  ): Promise<any> {
    // inbox 不允许修改 meta
    if (activeId === INBOX_SESSION_ID) return;

    const res = await request('/api/chat/sessions', {
      method: 'PUT',
      body: JSON.stringify({
        id: activeId,
        meta,
      }),
    });

    if (!res.success) {
      throw new Error(res.error || '更新会话元数据失败');
    }
  }

  async updateSessionChatConfig(
    activeId: string,
    config: PartialDeep<LobeAgentChatConfig>,
    _?: AbortSignal,
  ): Promise<any> {
    return this.updateSessionConfig(activeId, { chatConfig: config });
  }

  async removeSession(id: string): Promise<any> {
    const res = await request('/api/chat/sessions', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });

    if (!res.success) {
      throw new Error(res.error || '删除会话失败');
    }
  }

  async removeAllSessions(): Promise<any> {
    const sessions = await this.getSessionsByType('all');
    for (const session of sessions) {
      if (session.id !== INBOX_SESSION_ID) {
        await this.removeSession(session.id);
      }
    }
  }

  // ************************************** //
  // ***********  SessionGroup  *********** //
  // ************************************** //

  async createSessionGroup(_name: string, _sort?: number): Promise<string> {
    // Session groups not yet implemented in API
    throw new Error('createSessionGroup not implemented for server');
  }

  async getSessionGroups(): Promise<SessionGroupItem[]> {
    // Session groups not yet implemented in API
    return [];
  }

  async updateSessionGroup(_id: string, _data: Partial<SessionGroupItem>): Promise<any> {
    throw new Error('updateSessionGroup not implemented for server');
  }

  async updateSessionGroupOrder(_sortMap: { id: string; sort: number }[]): Promise<any> {
    throw new Error('updateSessionGroupOrder not implemented for server');
  }

  async removeSessionGroup(_id: string, _removeChildren?: boolean): Promise<any> {
    throw new Error('removeSessionGroup not implemented for server');
  }

  async removeSessionGroups(): Promise<any> {
    throw new Error('removeSessionGroups not implemented for server');
  }

  /**
   * 初始化会话配置
   * @param config 初始化配置选项
   */
  async initSessionConfig(config: SessionInitConfig = DEFAULT_SESSION_INIT_CONFIG): Promise<void> {
    // 若已有进行中的初始化，复用同一个 Promise，避免并发重复创建会话
    if (_inflightInitSessionConfig) {
      return _inflightInitSessionConfig;
    }

    _inflightInitSessionConfig = (async () => {
      try {
        const promises: Promise<any>[] = [];

        // 遍历配置映射，按 map 键读取初始化配置
        Object.entries(SESSION_CONFIG_MAP).forEach(
          ([id, { sessionConfig, agentConfig: defaultAgentConfig }]) => {
            const init = config[id as keyof SessionInitConfig];
            if (init?.enabled) {
              const agentConfig = init.config || defaultAgentConfig;
              // 创建会话
              promises.push(
                this.createSession(LobeSessionType.Agent, {
                  slug: sessionConfig.slug,
                  meta: {
                    title: sessionConfig.title,
                    description: sessionConfig.description,
                    avatar: sessionConfig.avatar,
                  },
                  agentId: sessionConfig.agentId,
                  config: agentConfig as LobeAgentConfig,
                }),
              );
            }
          },
        );

        // 并行执行所有创建操作
        if (promises.length > 0) {
          await Promise.all(promises);
        }
      } finally {
        // 完成后清除锁，下次可正常初始化
        _inflightInitSessionConfig = null;
      }
    })();

    return _inflightInitSessionConfig;
  }
}