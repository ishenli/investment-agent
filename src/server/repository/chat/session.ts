/**
 * Session Repository
 *
 * 聊天会话数据访问层
 */
import { db } from '@server/lib/db';
import { eq, and, desc, isNull, inArray, like, notInArray, notLike, sql } from 'drizzle-orm';
import { SCHEDULED_INSIGHT_SLUG_PREFIX } from '@/types/aiInsight';
import {
  chatSessions,
  chatSessionGroups,
  type ChatSession,
  type NewChatSession,
  type ChatSessionGroup,
  type NewChatSessionGroup,
  type AgentConfig,
  type SessionMeta,
} from '@drizzle/schema/chat';
import { BaseRepository } from './base';
import type { SQL } from 'drizzle-orm';

// Parameters for creating a session from controller (without userId)
export type CreateSessionParams = Omit<NewChatSession, 'id' | 'createdAt' | 'updatedAt' | 'userId'>;
// Parameters for repository create (includes userId)
export type CreateSessionRepoParams = Omit<NewChatSession, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateSessionParams = Partial<
  Pick<NewChatSession, 'slug' | 'type' | 'groupId' | 'pinned' | 'config' | 'meta' | 'agentId'>
>;

export class SessionRepository extends BaseRepository<ChatSession> {
  constructor() {
    super(chatSessions);
  }

  // ============== Query ==============

  /**
   * 根据 ID 查找会话
   */
  async findById(id: string): Promise<ChatSession | undefined> {
    return this._findById(id);
  }

  /**
   * 根据用户 ID 获取所有会话（排除会话式洞察任务的执行会话，避免污染聊天列表）
   */
  async findByUserId(userId: number): Promise<ChatSession[]> {
    return db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.userId, userId),
          notLike(chatSessions.slug, `${SCHEDULED_INSIGHT_SLUG_PREFIX}%`),
        ),
      )
      .orderBy(desc(chatSessions.updatedAt));
  }

  /**
   * 根据 slug 获取会话
   */
  async findBySlug(slug: string): Promise<ChatSession | undefined> {
    const results = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.slug, slug))
      .limit(1);

    return results[0];
  }

  /**
   * 获取用户的置顶会话
   */
  async findPinnedByUserId(userId: number): Promise<ChatSession[]> {
    return db
      .select()
      .from(chatSessions)
      .where(and(eq(chatSessions.userId, userId), eq(chatSessions.pinned, true)))
      .orderBy(desc(chatSessions.updatedAt));
  }

  /**
   * 根据分组 ID 获取会话
   */
  async findByGroupId(groupId: string): Promise<ChatSession[]> {
    return db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.groupId, groupId))
      .orderBy(desc(chatSessions.updatedAt));
  }

  /**
   * 获取未分组的会话
   */
  async findUngroupedByUserId(userId: number): Promise<ChatSession[]> {
    return db
      .select()
      .from(chatSessions)
      .where(and(eq(chatSessions.userId, userId), isNull(chatSessions.groupId)))
      .orderBy(desc(chatSessions.updatedAt));
  }

  /**
   * 根据用户 ID 和 Agent ID 获取会话
   */
  async findByUserIdAndAgentId(userId: number, agentId: string): Promise<ChatSession[]> {
    return db
      .select()
      .from(chatSessions)
      .where(and(eq(chatSessions.userId, userId), eq(chatSessions.agentId, agentId)))
      .orderBy(desc(chatSessions.updatedAt));
  }

  /**
   * 获取用户的会话式洞察执行会话（slug 以 scheduled-insight- 前缀开头）
   * 用于洞察历史页聚合展示会话式洞察产出。
   */
  async findScheduledInsightSessionsByUserId(
    userId: number,
  ): Promise<ChatSession[]> {
    return db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.userId, userId),
          like(chatSessions.slug, `${SCHEDULED_INSIGHT_SLUG_PREFIX}%`),
        ),
      )
      .orderBy(desc(chatSessions.createdAt));
  }

  /**
   * 裁剪超出保留上限的旧洞察执行会话（仅保留最近 keepCount 条）
   * @param userId 用户 ID
   * @param keepCount 保留的最新会话数
   * @returns 被删除的会话数
   */
  async deleteScheduledInsightSessionsBeyond(
    userId: number,
    keepCount: number,
  ): Promise<number> {
    const retained = await db
      .select({ id: chatSessions.id })
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.userId, userId),
          like(chatSessions.slug, `${SCHEDULED_INSIGHT_SLUG_PREFIX}%`),
        ),
      )
      .orderBy(desc(chatSessions.createdAt))
      .limit(keepCount);

    const retainedIds = retained.map((r) => r.id);
    const whereClause = and(
      eq(chatSessions.userId, userId),
      like(chatSessions.slug, `${SCHEDULED_INSIGHT_SLUG_PREFIX}%`),
    );

    const deleteClause =
      retainedIds.length > 0
        ? and(whereClause, notInArray(chatSessions.id, retainedIds))
        : whereClause;

    const deleted = await db
      .delete(chatSessions)
      .where(deleteClause)
      .returning({ id: chatSessions.id });
    return deleted.length;
  }

  // ============== Create ==============

  /**
   * 创建新会话
   */
  async create(data: CreateSessionRepoParams): Promise<string> {
    const result = await this._create({
      ...data,
      groupId: data.groupId ?? null,
    } as any);
    return result.id;
  }

  // ============== Update ==============

  /**
   * 更新会话
   */
  async update(id: string, data: UpdateSessionParams): Promise<boolean> {
    try {
      await db
        .update(chatSessions)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(chatSessions.id, id));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 更新会话配置
   */
  async updateConfig(id: string, config: Partial<AgentConfig>): Promise<boolean> {
    const session = await this._findById(id);
    if (!session) return false;

    const newConfig = { ...session.config, ...config } as AgentConfig;
    return this.update(id, { config: newConfig });
  }

  /**
   * 更新会话元数据
   */
  async updateMeta(id: string, meta: Partial<SessionMeta>): Promise<boolean> {
    const session = await this._findById(id);
    if (!session) return false;

    const newMeta = { ...session.meta, ...meta } as SessionMeta;
    return this.update(id, { meta: newMeta });
  }

  /**
   * 切换置顶状态
   */
  async togglePinned(id: string): Promise<boolean> {
    const session = await this._findById(id);
    if (!session) return false;

    return this.update(id, { pinned: !session.pinned });
  }

  // ============== Delete ==============

  /**
   * 删除会话（级联删除由数据库外键处理）
   */
  async delete(id: string): Promise<boolean> {
    return this._delete(id);
  }

  /**
   * 批量删除会话
   */
  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    await db.delete(chatSessions).where(inArray(chatSessions.id, ids));
  }

  /**
   * 删除用户的所有会话
   */
  async deleteByUserId(userId: number): Promise<void> {
    await db.delete(chatSessions).where(eq(chatSessions.userId, userId));
  }

  // ============== Count ==============

  /**
   * 统计用户的会话数量
   */
  async countByUserId(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)`.as('count') })
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId));

    return result[0]?.count ?? 0;
  }
}

// Session Group Repository
export class SessionGroupRepository extends BaseRepository<ChatSessionGroup> {
  constructor() {
    super(chatSessionGroups);
  }

  async findAll(): Promise<ChatSessionGroup[]> {
    return db.select().from(chatSessionGroups).orderBy(desc(chatSessionGroups.sort));
  }

  async create(data: Omit<NewChatSessionGroup, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const result = await this._create({
      ...data,
      sort: data.sort ?? 0,
    } as any);
    return result.id;
  }

  async update(id: string, data: Partial<Pick<NewChatSessionGroup, 'name' | 'sort'>>): Promise<boolean> {
    try {
      await db
        .update(chatSessionGroups)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(chatSessionGroups.id, id));
      return true;
    } catch {
      return false;
    }
  }

  async delete(id: string): Promise<boolean> {
    return this._delete(id);
  }
}

// Export singleton instances
export const sessionRepository = new SessionRepository();
export const sessionGroupRepository = new SessionGroupRepository();