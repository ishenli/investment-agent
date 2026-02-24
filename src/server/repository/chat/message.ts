/**
 * Message Repository
 *
 * 聊天消息数据访问层
 */
import { db } from '@server/lib/db';
import { eq, and, desc, asc, isNull, inArray, lt } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  chatMessages,
  type ChatMessage,
  type NewChatMessage,
  type PluginInfo,
  type TranslateInfo,
} from '@drizzle/schema/chat';
import { BaseRepository } from './base';

export type CreateMessageParams = Omit<NewChatMessage, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateMessageParams = Partial<
  Omit<NewChatMessage, 'id' | 'sessionId' | 'createdAt' | 'updatedAt'>
>;

export interface QueryMessageParams {
  sessionId: string;
  topicId?: string | null;
  pageSize?: number;
  cursor?: string; // 用于分页，上一页最后一条消息的 ID
}

export class MessageRepository extends BaseRepository<ChatMessage> {
  constructor() {
    super(chatMessages);
  }

  // ============== Query ==============

  /**
   * 查询会话-话题下的消息
   * 对应 Dexie MessageModel.query()
   */
  async query(params: QueryMessageParams): Promise<ChatMessage[]> {
    const { sessionId, topicId, pageSize = 50, cursor } = params;

    // 构建查询条件
    const conditions = topicId
      ? and(eq(chatMessages.sessionId, sessionId), eq(chatMessages.topicId, topicId))
      : and(eq(chatMessages.sessionId, sessionId), isNull(chatMessages.topicId));

    // 如果有游标，添加游标条件
    if (cursor) {
      // 获取游标消息的时间戳
      const cursorMsg = await this._findById(cursor);
      if (cursorMsg) {
        const finalConditions = and(
          conditions,
          lt(chatMessages.createdAt, cursorMsg.createdAt)
        );

        return db
          .select()
          .from(chatMessages)
          .where(finalConditions)
          .orderBy(desc(chatMessages.createdAt))
          .limit(pageSize);
      }
    }

    const messages = await db
      .select()
      .from(chatMessages)
      .where(conditions)
      .orderBy(asc(chatMessages.createdAt))
      .limit(pageSize);

    // 处理消息排序 - 确保父消息在子消息前面
    return this.sortMessagesByParent(messages);
  }

  /**
   * 按父子关系排序消息
   */
  private sortMessagesByParent(messages: ChatMessage[]): ChatMessage[] {
    const finalList: ChatMessage[] = [];
    const messageMap = new Map<string, ChatMessage>();

    for (const msg of messages) {
      messageMap.set(msg.id, msg);
    }

    const added = new Set<string>();

    const addMessage = (msg: ChatMessage) => {
      if (added.has(msg.id)) return;
      added.add(msg.id);
      finalList.push(msg);
    };

    for (const msg of messages) {
      if (msg.parentId && messageMap.has(msg.parentId)) {
        // 先添加父消息
        addMessage(messageMap.get(msg.parentId)!);
      }
      addMessage(msg);
    }

    return finalList;
  }

  /**
   * 根据会话 ID 获取所有消息
   */
  async findBySessionId(sessionId: string): Promise<ChatMessage[]> {
    return db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(asc(chatMessages.createdAt));
  }

  /**
   * 根据话题 ID 获取所有消息
   */
  async findByTopicId(topicId: string): Promise<ChatMessage[]> {
    return db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.topicId, topicId))
      .orderBy(asc(chatMessages.createdAt));
  }

  /**
   * 获取会话中不属于任何话题的消息
   */
  async findWithoutTopic(sessionId: string): Promise<ChatMessage[]> {
    return db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.sessionId, sessionId), isNull(chatMessages.topicId)))
      .orderBy(asc(chatMessages.createdAt));
  }

  /**
   * 获取最新的 N 条消息
   */
  async findRecent(sessionId: string, limit: number = 10): Promise<ChatMessage[]> {
    return db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  /**
   * 根据角色查询消息
   */
  async findByRole(
    sessionId: string,
    role: 'user' | 'system' | 'assistant' | 'tool'
  ): Promise<ChatMessage[]> {
    return db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.sessionId, sessionId), eq(chatMessages.role, role)))
      .orderBy(asc(chatMessages.createdAt));
  }

  /**
   * 根据 traceId 查询消息
   */
  async findByTraceId(traceId: string): Promise<ChatMessage | undefined> {
    const results = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.traceId, traceId))
      .limit(1);

    return results[0];
  }

  /**
   * 根据 tool_call_id 查询消息
   */
  async findByToolCallId(toolCallId: string): Promise<ChatMessage | undefined> {
    const results = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.toolCallId, toolCallId))
      .limit(1);

    return results[0];
  }

  // ============== Create ==============

  /**
   * 创建消息
   */
  async create(data: CreateMessageParams): Promise<string> {
    const id = nanoid();
    const now = new Date();

    await db.insert(chatMessages).values({
      id,
      ...data,
      createdAt: now,
      updatedAt: now,
    });

    return id;
  }

  /**
   * 批量创建消息
   */
  async batchCreate(messages: CreateMessageParams[]): Promise<string[]> {
    const ids: string[] = [];
    const now = new Date();

    const values = messages.map((data) => {
      const id = nanoid();
      ids.push(id);
      return {
        id,
        ...data,
        createdAt: now,
        updatedAt: now,
      };
    });

    await db.insert(chatMessages).values(values);

    return ids;
  }

  // ============== Update ==============

  /**
   * 更新消息
   */
  async update(id: string, data: UpdateMessageParams): Promise<boolean> {
    try {
      await db
        .update(chatMessages)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(chatMessages.id, id));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 更新消息内容
   */
  async updateContent(id: string, content: string): Promise<boolean> {
    return this.update(id, { content });
  }

  /**
   * 更新消息错误信息
   */
  async updateError(id: string, error: unknown): Promise<boolean> {
    return this.update(id, { error });
  }

  /**
   * 更新插件状态
   */
  async updatePluginState(id: string, pluginState: Record<string, unknown>): Promise<boolean> {
    const message = await this._findById(id);
    if (!message || !message.pluginState) return false;

    const newState = { ...(message.pluginState as Record<string, unknown>), ...pluginState };
    return this.update(id, { pluginState: newState });
  }

  /**
   * 更新插件信息
   */
  async updatePlugin(id: string, plugin: Partial<PluginInfo>): Promise<boolean> {
    const message = await this._findById(id);
    if (!message || !message.plugin) return false;

    const newPlugin = { ...(message.plugin as PluginInfo), ...plugin };
    return this.update(id, { plugin: newPlugin });
  }

  /**
   * 更新用户点赞状态
   */
  async updateLikeStatus(
    id: string,
    userLikeTag: 'like' | 'dislike' | 'unknown',
    dislikeReason?: string
  ): Promise<boolean> {
    return this.update(id, { userLikeTag, dislikeReason });
  }

  /**
   * 更新翻译
   */
  async updateTranslate(id: string, translate: Partial<TranslateInfo> | false): Promise<boolean> {
    return this.update(id, { translate: translate === false ? null : translate });
  }

  /**
   * 绑定消息到话题
   */
  async bindToTopic(messageIds: string[], topicId: string): Promise<number> {
    const result = await db
      .update(chatMessages)
      .set({ topicId, updatedAt: new Date() })
      .where(inArray(chatMessages.id, messageIds));

    return result.rowsAffected;
  }

  // ============== Delete ==============

  /**
   * 删除消息
   */
  async delete(id: string): Promise<boolean> {
    return this._delete(id);
  }

  /**
   * 批量删除消息
   */
  async deleteMany(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;

    const result = await db.delete(chatMessages).where(inArray(chatMessages.id, ids));

    return result.rowsAffected;
  }

  /**
   * 删除会话-话题下的所有消息
   */
  async deleteBySessionAndTopic(sessionId: string, topicId?: string | null): Promise<number> {
    const conditions = topicId
      ? and(eq(chatMessages.sessionId, sessionId), eq(chatMessages.topicId, topicId))
      : and(eq(chatMessages.sessionId, sessionId), isNull(chatMessages.topicId));

    const result = await db.delete(chatMessages).where(conditions);

    return result.rowsAffected;
  }

  /**
   * 删除会话的所有消息
   */
  async deleteBySessionId(sessionId: string): Promise<number> {
    const result = await db.delete(chatMessages).where(eq(chatMessages.sessionId, sessionId));

    return result.rowsAffected;
  }

  /**
   * 删除话题的所有消息
   */
  async deleteByTopicId(topicId: string): Promise<number> {
    const result = await db.delete(chatMessages).where(eq(chatMessages.topicId, topicId));

    return result.rowsAffected;
  }

  // ============== Count ==============

  /**
   * 统计消息数量
   */
  async count(sessionId?: string, topicId?: string): Promise<number> {
    if (!sessionId) {
      const results = await db.select({ id: chatMessages.id }).from(chatMessages);
      return results.length;
    }

    const conditions = topicId
      ? and(eq(chatMessages.sessionId, sessionId), eq(chatMessages.topicId, topicId))
      : and(eq(chatMessages.sessionId, sessionId), isNull(chatMessages.topicId));

    const results = await db.select({ id: chatMessages.id }).from(chatMessages).where(conditions);

    return results.length;
  }

  /**
   * 检查是否有消息
   */
  async hasMessages(): Promise<boolean> {
    const results = await db.select({ id: chatMessages.id }).from(chatMessages).limit(1);
    return results.length > 0;
  }
}

// Export singleton instance
export const messageRepository = new MessageRepository();