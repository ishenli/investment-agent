/**
 * Topic Server Service
 *
 * 服务端 Topic 服务，通过 API 调用后端接口
 */
import { ChatTopic, TopicRankItem } from '@typings/topic';

import { CreateTopicParams, ITopicService, QueryTopicParams, BatchTaskResult } from './type';

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

export class ServerService implements ITopicService {
  async createTopic(params: CreateTopicParams): Promise<string> {
    const res = await request<{ id: string; message: string }>('/api/chat/topics', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: params.sessionId,
        title: params.title,
        favorite: params.favorite,
        messages: params.messages,
      }),
    });

    if (!res.success) {
      throw new Error(res.error || '创建话题失败');
    }

    // res.data is { id, message } from this.success({ id, message })
    return res.data!.id;
  }

  async batchCreateTopics(_importTopics: ChatTopic[]): Promise<BatchTaskResult> {
    throw new Error('batchCreateTopics not implemented for server');
  }

  async cloneTopic(_id: string, _newTitle?: string): Promise<string> {
    throw new Error('cloneTopic not implemented for server');
  }

  async getTopics(params: QueryTopicParams): Promise<ChatTopic[]> {
    const res = await request<{ topics: ChatTopic[] }>(
      `/api/chat/topics?sessionId=${params.sessionId}`
    );

    if (!res.success) {
      throw new Error(res.error || '获取话题列表失败');
    }

    return res.data!.topics;
  }

  async getAllTopics(): Promise<ChatTopic[]> {
    throw new Error('getAllTopics not implemented for server');
  }

  async countTopics(): Promise<number> {
    throw new Error('countTopics not implemented for server');
  }

  async rankTopics(): Promise<TopicRankItem[]> {
    throw new Error('rankTopics not implemented for server');
  }

  async searchTopics(_keyword: string, _sessionId?: string): Promise<ChatTopic[]> {
    throw new Error('searchTopics not implemented for server');
  }

  async updateTopic(id: string, data: Partial<ChatTopic>): Promise<void> {
    const res = await request('/api/chat/topics', {
      method: 'PUT',
      body: JSON.stringify({ id, ...data }),
    });

    if (!res.success) {
      throw new Error(res.error || '更新话题失败');
    }
  }

  async removeTopic(id: string): Promise<void> {
    const res = await request('/api/chat/topics', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });

    if (!res.success) {
      throw new Error(res.error || '删除话题失败');
    }
  }

  async removeTopics(sessionId: string): Promise<void> {
    // Get all topics for the session and delete them
    const topics = await this.getTopics({ sessionId });
    for (const topic of topics) {
      await this.removeTopic(topic.id);
    }
  }

  async batchRemoveTopics(topics: string[]): Promise<void> {
    for (const id of topics) {
      await this.removeTopic(id);
    }
  }

  async removeAllTopic(): Promise<void> {
    throw new Error('removeAllTopic not implemented for server');
  }
}