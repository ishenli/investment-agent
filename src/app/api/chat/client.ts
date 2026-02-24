/**
 * Chat API Client
 *
 * 客户端 API 调用封装，用于 Store 层调用后端 Chat API
 */
import type { ChatTopic } from '@typings/topic';
import type { ChatMessage } from '@typings/message';

// ============== Types ==============

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}

export interface Session {
  id: string;
  userId: number;
  slug: string;
  type: 'agent' | 'group';
  groupId: string | null;
  pinned: boolean;
  config: Record<string, unknown>;
  meta: {
    title?: string;
    description?: string;
    avatar?: string;
    backgroundColor?: string;
  };
  agentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSessionParams {
  slug: string;
  type: 'agent' | 'group';
  groupId?: string;
  pinned?: boolean;
  config: Record<string, unknown>;
  meta: {
    title?: string;
    description?: string;
    avatar?: string;
    backgroundColor?: string;
  };
  agentId?: string;
}

export interface UpdateSessionParams {
  id: string;
  slug?: string;
  groupId?: string | null;
  pinned?: boolean;
  config?: Record<string, unknown>;
  meta?: {
    title?: string;
    description?: string;
    avatar?: string;
    backgroundColor?: string;
  };
}

export interface CreateTopicParams {
  sessionId: string;
  title: string;
  favorite?: boolean;
}

export interface UpdateTopicParams {
  id: string;
  title?: string;
  favorite?: boolean;
}

export interface QueryMessagesParams {
  sessionId: string;
  topicId?: string;
  pageSize?: number;
  cursor?: string;
}

export interface CreateMessageParams {
  sessionId: string;
  topicId?: string;
  parentId?: string;
  role: 'user' | 'system' | 'assistant' | 'tool';
  content: string;
  files?: string[];
  model?: string;
  provider?: string;
  traceId?: string;
}

export interface UpdateMessageParams {
  id: string;
  content?: string;
  userLikeTag?: 'like' | 'dislike' | 'unknown';
}

// ============== Helper ==============

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();
  return data;
}

// ============== Session API ==============

export const sessionApi = {
  /**
   * 获取所有会话
   */
  async getSessions(): Promise<Session[]> {
    const res = await request<Session[]>('/api/chat/sessions');
    if (!res.success) throw new Error(res.error || '获取会话列表失败');
    return res.data!;
  },

  /**
   * 获取单个会话
   */
  async getSession(id: string): Promise<Session> {
    const res = await request<Session>(`/api/chat/sessions?id=${id}`);
    if (!res.success) throw new Error(res.error || '获取会话失败');
    return res.data!;
  },

  /**
   * 创建会话
   */
  async createSession(params: CreateSessionParams): Promise<string> {
    const res = await request<{ id: string; message: string }>('/api/chat/sessions', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (!res.success) throw new Error(res.error || '创建会话失败');
    return res.data!.id;
  },

  /**
   * 更新会话
   */
  async updateSession(params: UpdateSessionParams): Promise<void> {
    const res = await request('/api/chat/sessions', {
      method: 'PUT',
      body: JSON.stringify(params),
    });
    if (!res.success) throw new Error(res.error || '更新会话失败');
  },

  /**
   * 删除会话
   */
  async deleteSession(id: string): Promise<void> {
    const res = await request('/api/chat/sessions', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
    if (!res.success) throw new Error(res.error || '删除会话失败');
  },
};

// ============== Topic API ==============

export const topicApi = {
  /**
   * 获取话题列表
   */
  async getTopics(sessionId: string): Promise<ChatTopic[]> {
    const res = await request<{ topics: ChatTopic[] }>(
      `/api/chat/topics?sessionId=${sessionId}`
    );
    if (!res.success) throw new Error(res.error || '获取话题列表失败');
    return res.data!.topics;
  },

  /**
   * 创建话题
   */
  async createTopic(params: CreateTopicParams): Promise<string> {
    const res = await request<{ id: string; message: string }>('/api/chat/topics', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (!res.success) throw new Error(res.error || '创建话题失败');
    return res.data!.id;
  },

  /**
   * 更新话题
   */
  async updateTopic(params: UpdateTopicParams): Promise<void> {
    const res = await request('/api/chat/topics', {
      method: 'PUT',
      body: JSON.stringify(params),
    });
    if (!res.success) throw new Error(res.error || '更新话题失败');
  },

  /**
   * 删除话题
   */
  async deleteTopic(id: string): Promise<void> {
    const res = await request('/api/chat/topics', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
    if (!res.success) throw new Error(res.error || '删除话题失败');
  },
};

// ============== Message API ==============

export const messageApi = {
  /**
   * 获取消息列表
   */
  async getMessages(params: QueryMessagesParams): Promise<ChatMessage[]> {
    const query = new URLSearchParams({
      sessionId: params.sessionId,
      ...(params.topicId && { topicId: params.topicId }),
      ...(params.pageSize && { pageSize: params.pageSize.toString() }),
      ...(params.cursor && { cursor: params.cursor }),
    });
    const res = await request<{ messages: ChatMessage[] }>(
      `/api/chat/messages?${query.toString()}`
    );
    if (!res.success) throw new Error(res.error || '获取消息列表失败');
    return res.data!.messages;
  },

  /**
   * 创建消息
   */
  async createMessage(params: CreateMessageParams): Promise<string> {
    const res = await request<{ id: string; message: string }>('/api/chat/messages', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (!res.success) throw new Error(res.error || '创建消息失败');
    return res.data!.id;
  },

  /**
   * 更新消息
   */
  async updateMessage(params: UpdateMessageParams): Promise<void> {
    const res = await request('/api/chat/messages', {
      method: 'PUT',
      body: JSON.stringify(params),
    });
    if (!res.success) throw new Error(res.error || '更新消息失败');
  },

  /**
   * 删除消息
   */
  async deleteMessage(id: string): Promise<void> {
    const res = await request('/api/chat/messages', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
    if (!res.success) throw new Error(res.error || '删除消息失败');
  },
};

// ============== Export ==============

export const chatApi = {
  session: sessionApi,
  topic: topicApi,
  message: messageApi,
};

export default chatApi;