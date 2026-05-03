import { notifications } from '@/drizzle/schema';
import { db } from '../lib/db';
import { eq, and, desc, asc, SQL, gte, lte, inArray, sql } from 'drizzle-orm';
import type { CreateNotificationRequestType, NotificationPriorityValue, NotificationTypeValue } from '@/types/notification';

export interface NotificationQueryOptions {
  userId: number;
  page?: number;
  pageSize?: number;
  isRead?: 'all' | 'read' | 'unread';
  type?: NotificationTypeValue;
  priority?: NotificationPriorityValue;
}

export interface NotificationEntity {
  id: number;
  userId: number;
  type: NotificationTypeValue;
  title: string;
  message: string;
  data: string | null;
  isRead: boolean;
  priority: NotificationPriorityValue;
  link: string | null;
  createdAt: Date;
  readAt: Date | null;
}

class NotificationRepository {
  /**
   * 创建新通知
   */
  async create(
    userId: number,
    notification: Omit<CreateNotificationRequestType, 'userId'>,
  ): Promise<NotificationEntity> {
    const result = await db
      .insert(notifications)
      .values({
        userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data ? JSON.stringify(notification.data) : null,
        priority: notification.priority || 'medium',
        link: notification.link || null,
        isRead: false,
      })
      .returning();

    return result[0] as NotificationEntity;
  }

  /**
   * 获取通知列表
   */
  async findMany(options: NotificationQueryOptions): Promise<{
    items: NotificationEntity[];
    totalCount: number;
  }> {
    const { userId, page = 1, pageSize = 20, isRead = 'all', type, priority } = options;
    const offset = (page - 1) * pageSize;

    // 构建查询条件
    const conditions: SQL[] = [eq(notifications.userId, userId)];

    if (isRead === 'read') {
      conditions.push(eq(notifications.isRead, true));
    } else if (isRead === 'unread') {
      conditions.push(eq(notifications.isRead, false));
    }

    if (type) {
      conditions.push(eq(notifications.type, type));
    }

    if (priority) {
      conditions.push(eq(notifications.priority, priority));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 获取总数
    const countResult = await db
      .select({ count: sql`count(*)` })
      .from(notifications)
      .where(whereClause);
    const totalCount = Number(countResult[0]?.count || 0);

    // 获取列表
    const items = await db
      .select()
      .from(notifications)
      .where(whereClause)
      .orderBy(desc(notifications.createdAt))
      .limit(pageSize)
      .offset(offset);

    return {
      items: items as NotificationEntity[],
      totalCount,
    };
  }

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    return Number(result[0]?.count || 0);
  }

  /**
   * 获取通知统计
   */
  async getStats(userId: number): Promise<{
    totalCount: number;
    unreadCount: number;
    unreadByType: Record<string, number>;
    unreadByPriority: Record<string, number>;
  }> {
    // 总数
    const totalResult = await db
      .select({ count: sql`count(*)` })
      .from(notifications)
      .where(eq(notifications.userId, userId));
    const totalCount = Number(totalResult[0]?.count || 0);

    // 未读数
    const unreadResult = await db
      .select({ count: sql`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    const unreadCount = Number(unreadResult[0]?.count || 0);

    // 按类型统计未读
    const unreadByTypeResult = await db
      .select({
        type: notifications.type,
        count: sql`count(*)`,
      })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .groupBy(notifications.type);

    const unreadByType: Record<string, number> = {};
    for (const row of unreadByTypeResult) {
      unreadByType[row.type] = Number(row.count);
    }

    // 按优先级统计未读
    const unreadByPriorityResult = await db
      .select({
        priority: notifications.priority,
        count: sql`count(*)`,
      })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .groupBy(notifications.priority);

    const unreadByPriority: Record<string, number> = {};
    for (const row of unreadByPriorityResult) {
      unreadByPriority[row.priority] = Number(row.count);
    }

    return {
      totalCount,
      unreadCount,
      unreadByType,
      unreadByPriority,
    };
  }

  /**
   * 根据 ID 获取通知
   */
  async findById(id: number): Promise<NotificationEntity | null> {
    const result = await db.select().from(notifications).where(eq(notifications.id, id));
    return (result[0] as NotificationEntity) || null;
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(id: number): Promise<NotificationEntity | null> {
    const result = await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(eq(notifications.id, id))
      .returning();

    return (result[0] as NotificationEntity) || null;
  }

  /**
   * 批量标记用户所有通知为已读
   */
  async markAllAsRead(userId: number): Promise<number> {
    const result = await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .returning();

    return result.length;
  }

  /**
   * 删除通知
   */
  async delete(id: number): Promise<boolean> {
    const result = await db.delete(notifications).where(eq(notifications.id, id)).returning();
    return result.length > 0;
  }

  /**
   * 删除用户的所有已读通知
   */
  async deleteAllRead(userId: number): Promise<number> {
    const result = await db
      .delete(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, true)))
      .returning();

    return result.length;
  }
}

export default new NotificationRepository();
