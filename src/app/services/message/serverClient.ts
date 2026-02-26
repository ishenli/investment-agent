/**
 * Message Server Service
 *
 * 服务端 Message 服务，通过 API 调用后端接口
 */
import {
  ChatMessage,
  ChatMessageError,
  ChatMessagePluginError,
  CreateMessageParams,
} from '@typings/message';

import { IMessageService } from './type';

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

  const res = await response.json();
  return res;
}

export class ServerService implements IMessageService {
  async createMessage(data: CreateMessageParams): Promise<string> {
    const res = await request<{ id: string; message: string }>('/api/chat/messages', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: data.sessionId,
        topicId: data.topicId,
        parentId: data.parentId,
        role: data.role,
        content: data.content,
        files: data.files,
        model: data.fromModel,
        provider: data.fromProvider,
        traceId: data.traceId,
      }),
    });

    if (!res.success) {
      throw new Error(res.error || '创建消息失败');
    }

    return res.data!.id;
  }

  async batchCreateMessages(): Promise<any> {
    throw new Error('batchCreateMessages not implemented for server');
  }

  async getMessages(sessionId: string, topicId?: string): Promise<ChatMessage[]> {
    const query = new URLSearchParams({
      sessionId,
      pageSize: '1000', // Get all messages
    });
    if (topicId) {
      query.set('topicId', topicId);
    }

    const res = await request<{ messages: ChatMessage[] }>(
      `/api/chat/messages?${query.toString()}`
    );

    if (!res.success) {
      throw new Error(res.error || '获取消息列表失败');
    }

    return res.data!.messages;
  }

  async getAllMessages(): Promise<ChatMessage[]> {
    throw new Error('getAllMessages not implemented for server');
  }

  async getAllMessagesInSession(): Promise<ChatMessage[]> {
    throw new Error('getAllMessagesInSession not implemented for server');
  }

  async countMessages(): Promise<number> {
    throw new Error('countMessages not implemented for server');
  }

  async countWords(): Promise<number> {
    throw new Error('countWords not implemented for server');
  }

  async rankModels(): Promise<any> {
    throw new Error('rankModels not implemented for server');
  }

  async updateMessageError(id: string, error: ChatMessageError): Promise<void> {
    await this.updateMessage(id, { error } as any);
  }

  async updateMessage(id: string, message: any): Promise<void> {
    const res = await request('/api/chat/messages', {
      method: 'PUT',
      body: JSON.stringify({ id, ...message }),
    });

    if (!res.success) {
      throw new Error(res.error || '更新消息失败');
    }
  }

  async updateMessageTTS(): Promise<any> {
    throw new Error('updateMessageTTS not implemented for server');
  }

  async updateMessageTranslate(): Promise<any> {
    throw new Error('updateMessageTranslate not implemented for server');
  }

  async removeMessage(id: string): Promise<void> {
    const res = await request('/api/chat/messages', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });

    if (!res.success) {
      throw new Error(res.error || '删除消息失败');
    }
  }

  async removeMessages(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.removeMessage(id);
    }
  }

  async removeMessagesByAssistant(assistantId: string, topicId?: string): Promise<void> {
    // Get messages and delete them
    const messages = await this.getMessages(assistantId, topicId);
    for (const msg of messages) {
      await this.removeMessage(msg.id);
    }
  }

  async removeAllMessages(): Promise<any> {
    throw new Error('removeAllMessages not implemented for server');
  }

  async messageCountToCheckTrace(): Promise<boolean> {
    // Not implemented for server
    return false;
  }

  async hasMessages(): Promise<boolean> {
    // Not implemented for server
    return false;
  }

  // Additional methods for compatibility
  async getMessageLikeStatus(_id: string): Promise<'like' | 'dislike' | 'unknown' | undefined> {
    // This method requires API support - currently returns undefined
    // In future, this could call a dedicated API endpoint
    return undefined;
  }

  async updateMessageLikeStatus(
    id: string,
    likeResult: 'like' | 'dislike' | 'unknown',
    _reason?: string,
  ): Promise<void> {
    await this.updateMessage(id, {
      userLikeTag: likeResult,
    } as any);
  }

  async updateMessagePluginError(_id: string, _value: ChatMessagePluginError): Promise<void> {
    throw new Error('updateMessagePluginError not implemented for server');
  }

  async getHeatmaps(): Promise<any> {
    throw new Error('getHeatmaps not implemented for server');
  }
}