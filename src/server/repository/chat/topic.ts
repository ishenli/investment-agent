/**
 * Topic Repository
 *
 * 聊天话题数据访问层
 */
import { db } from '@server/lib/db';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import {
  chatTopics,
  chatMessages,
  type ChatTopic,
  type NewChatTopic,
} from '@drizzle/schema/chat';
import { BaseRepository } from './base';

export type CreateTopicParams = Omit<NewChatTopic, 'id' | 'createdAt' | 'updatedAt'> & {
  messages?: string[];
};
export type UpdateTopicParams = Partial<Pick<NewChatTopic, 'title' | 'favorite'>>;

export class TopicRepository extends BaseRepository<ChatTopic> {
  constructor() {
    super(chatTopics);
  }

  // ============== Query ==============

  /**
   * 根据 ID 查找话题
   */
  async findById(id: string): Promise<ChatTopic | undefined> {
    return this._findById(id);
  }

  /**
   * 根据会话 ID 获取话题列表
   */
  async findBySessionId(sessionId: string): Promise<ChatTopic[]> {
    return db
      .select()
      .from(chatTopics)
      .where(eq(chatTopics.sessionId, sessionId))
      .orderBy(desc(chatTopics.updatedAt));
  }

  /**
   * 获取收藏的话题
   */
  async findFavorites(sessionId: string): Promise<ChatTopic[]> {
    return db
      .select()
      .from(chatTopics)
      .where(and(eq(chatTopics.sessionId, sessionId), eq(chatTopics.favorite, true)))
      .orderBy(desc(chatTopics.updatedAt));
  }

  /**
   * 根据标题搜索话题
   */
  async searchByTitle(sessionId: string, keyword: string): Promise<ChatTopic[]> {
    // SQLite LIKE 查询
    return db
      .select()
      .from(chatTopics)
      .where(
        and(
          eq(chatTopics.sessionId, sessionId)
          // 对于模糊搜索，需要使用 SQL 模板
        )
      )
      .orderBy(desc(chatTopics.updatedAt));
  }

  // ============== Create ==============

  /**
   * 创建话题
   */
  async create(data: CreateTopicParams): Promise<string> {
    const { messages, ...topicData } = data;
    const result = await this._create({
      ...topicData,
      favorite: topicData.favorite ?? false,
    });
    const id = result.id;

    // 绑定消息到话题
    if (messages && messages.length > 0) {
      await db
        .update(chatMessages)
        .set({ topicId: id, updatedAt: new Date() })
        .where(inArray(chatMessages.id, messages));
    }

    return id;
  }

  // ============== Update ==============

  /**
   * 更新话题
   */
  async update(id: string, data: UpdateTopicParams): Promise<boolean> {
    try {
      await db
        .update(chatTopics)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(chatTopics.id, id));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 更新话题标题
   */
  async updateTitle(id: string, title: string): Promise<boolean> {
    return this.update(id, { title });
  }

  /**
   * 切换收藏状态
   */
  async toggleFavorite(id: string): Promise<boolean> {
    const topic = await this._findById(id);
    if (!topic) return false;

    return this.update(id, { favorite: !topic.favorite });
  }

  // ============== Delete ==============

  /**
   * 删除话题（级联删除消息由数据库外键处理）
   */
  async delete(id: string): Promise<boolean> {
    return this._delete(id);
  }

  /**
   * 批量删除话题
   */
  async deleteMany(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;

    const result = await db.delete(chatTopics).where(inArray(chatTopics.id, ids));

    return result.rowsAffected;
  }

  /**
   * 删除会话的所有话题
   */
  async deleteBySessionId(sessionId: string): Promise<number> {
    const result = await db.delete(chatTopics).where(eq(chatTopics.sessionId, sessionId));

    return result.rowsAffected;
  }

  // ============== Count ==============

  /**
   * 统计会话的话题数量
   */
  async countBySessionId(sessionId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)`.as('count') })
      .from(chatTopics)
      .where(eq(chatTopics.sessionId, sessionId));

    return result[0]?.count ?? 0;
  }
}

// Export singleton instance
export const topicRepository = new TopicRepository();