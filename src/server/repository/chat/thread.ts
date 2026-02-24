/**
 * Thread Repository
 *
 * 消息线程数据访问层
 */
import { db } from '@server/lib/db';
import { eq, and, desc, inArray, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  chatThreads,
  type ChatThread,
  type NewChatThread,
} from '@drizzle/schema/chat';
import { BaseRepository } from './base';

export type CreateThreadParams = Omit<NewChatThread, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateThreadParams = Partial<
  Pick<NewChatThread, 'title' | 'status' | 'lastActiveAt'>
>;

export class ThreadRepository extends BaseRepository<ChatThread> {
  constructor() {
    super(chatThreads as any);
  }

  // ============== Query ==============

  /**
   * 根据话题 ID 获取线程列表
   */
  async findByTopicId(topicId: string): Promise<ChatThread[]> {
    const results = await db
      .select()
      .from(chatThreads)
      .where(eq(chatThreads.topicId as any, topicId))
      .orderBy(desc(chatThreads.lastActiveAt as any));
    return results as ChatThread[];
  }

  /**
   * 获取活跃线程
   */
  async findActiveByTopicId(topicId: string): Promise<ChatThread[]> {
    const results = await db
      .select()
      .from(chatThreads)
      .where(
        and(
          eq(chatThreads.topicId as any, topicId),
          eq(chatThreads.status as any, 'active')
        )
      )
      .orderBy(desc(chatThreads.lastActiveAt as any));
    return results as ChatThread[];
  }

  /**
   * 根据源消息 ID 获取线程
   */
  async findBySourceMessageId(sourceMessageId: string): Promise<ChatThread[]> {
    const results = await db
      .select()
      .from(chatThreads)
      .where(eq(chatThreads.sourceMessageId as any, sourceMessageId));
    return results as ChatThread[];
  }

  /**
   * 根据话题和源消息获取线程
   */
  async findByTopicAndSourceMessage(
    topicId: string,
    sourceMessageId: string
  ): Promise<ChatThread | undefined> {
    const results = await db
      .select()
      .from(chatThreads)
      .where(
        and(
          eq(chatThreads.topicId as any, topicId),
          eq(chatThreads.sourceMessageId as any, sourceMessageId)
        )
      )
      .limit(1);

    return results[0] as ChatThread | undefined;
  }

  /**
   * 获取子线程
   */
  async findChildren(parentThreadId: string): Promise<ChatThread[]> {
    const results = await db
      .select()
      .from(chatThreads)
      .where(eq(chatThreads.parentThreadId as any, parentThreadId))
      .orderBy(desc(chatThreads.lastActiveAt as any));
    return results as ChatThread[];
  }

  /**
   * 获取根线程（无父线程）
   */
  async findRootThreads(topicId: string): Promise<ChatThread[]> {
    const results = await db
      .select()
      .from(chatThreads)
      .where(
        and(
          eq(chatThreads.topicId as any, topicId),
          isNull(chatThreads.parentThreadId as any)
        )
      )
      .orderBy(desc(chatThreads.lastActiveAt as any));
    return results as ChatThread[];
  }

  // ============== Create ==============

  /**
   * 创建线程
   */
  async create(data: CreateThreadParams): Promise<string> {
    const id = nanoid();
    const now = new Date();

    await db.insert(chatThreads).values({
      id,
      ...data,
      lastActiveAt: data.lastActiveAt || now,
      createdAt: now,
      updatedAt: now,
    } as any);

    return id;
  }

  // ============== Update ==============

  /**
   * 更新线程
   */
  async update(id: string, data: UpdateThreadParams): Promise<boolean> {
    try {
      await db
        .update(chatThreads)
        .set({
          ...data,
          updatedAt: new Date(),
        } as any)
        .where(eq(chatThreads.id as any, id));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 更新线程状态
   */
  async updateStatus(
    id: string,
    status: 'active' | 'deprecated' | 'archived'
  ): Promise<boolean> {
    return this.update(id, { status });
  }

  /**
   * 更新最后活跃时间
   */
  async touch(id: string): Promise<boolean> {
    return this.update(id, { lastActiveAt: new Date() });
  }

  // ============== Delete ==============

  /**
   * 删除线程
   */
  async delete(id: string): Promise<boolean> {
    return this._delete(id);
  }

  /**
   * 批量删除线程
   */
  async deleteMany(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;

    const result = await db.delete(chatThreads).where(inArray(chatThreads.id as any, ids));

    return result.rowsAffected;
  }

  /**
   * 删除话题的所有线程
   */
  async deleteByTopicId(topicId: string): Promise<number> {
    const result = await db.delete(chatThreads).where(eq(chatThreads.topicId as any, topicId));

    return result.rowsAffected;
  }
}

// Export singleton instance
export const threadRepository = new ThreadRepository();