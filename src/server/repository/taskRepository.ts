/**
 * Task Repository
 *
 * 数据访问层：负责 tasks 表的数据库操作
 * 支持软删除、分页、搜索、按状态分组
 */
import { db } from '@server/lib/db';
import { tasks } from '@/drizzle/schema';
import { eq, and, like, or, desc, asc, lte, gte, SQL, sql, inArray, isNull } from 'drizzle-orm';
import { BaseIntRepository } from './base';
import type { TaskStatus, TaskPriority, TaskType } from '@/types/task';

// Entity types derived from schema
export type TaskEntity = typeof tasks.$inferSelect;
export type CreateTaskData = Omit<TaskEntity, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type UpdateTaskData = Partial<Omit<TaskEntity, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'userId'>>;

export class TaskRepository extends BaseIntRepository<TaskEntity> {
  protected readonly enableSoftDelete = true;

  constructor() {
    super(tasks);
  }

  // ============== Query Operations ==============

  /**
   * 根据ID和用户ID查找任务
   */
  async findByIdAndUserId(taskId: number, userId: number): Promise<TaskEntity | null> {
    return this.findOne(and(eq(tasks.id, taskId), eq(tasks.userId, userId))!);
  }

  /**
   * 根据用户ID查找任务（分页、搜索、多维过滤、排序）
   */
  async findByUserId(
    userId: number,
    options?: {
      limit?: number;
      offset?: number;
      status?: TaskStatus | TaskStatus[];
      priority?: TaskPriority | TaskPriority[];
      type?: TaskType;
      search?: string;
      dueDateFrom?: Date;
      dueDateTo?: Date;
      sortBy?: 'createdAt' | 'updatedAt' | 'dueDate' | 'priority';
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<{ items: TaskEntity[]; totalCount: number }> {
    const conditions: SQL[] = [eq(tasks.userId, userId)];

    // Status filter
    if (options?.status) {
      if (Array.isArray(options.status)) {
        if (options.status.length > 0) {
          conditions.push(inArray(tasks.status, options.status));
        }
      } else {
        conditions.push(eq(tasks.status, options.status));
      }
    }

    // Priority filter
    if (options?.priority) {
      if (Array.isArray(options.priority)) {
        if (options.priority.length > 0) {
          conditions.push(inArray(tasks.priority, options.priority));
        }
      } else {
        conditions.push(eq(tasks.priority, options.priority));
      }
    }

    // Type filter
    if (options?.type) {
      conditions.push(eq(tasks.type, options.type));
    }

      // Search filter (title + description)
      if (options?.search?.trim()) {
        const searchTerm = options.search.trim();
        if (searchTerm.length >= 2) {
          conditions.push(
            or(
              like(tasks.title, `%${searchTerm}%`),
              like(tasks.description, `%${searchTerm}%`),
            )!,
          );
        }
      }

    // Due date range
    if (options?.dueDateFrom) {
      conditions.push(gte(tasks.dueDate, options.dueDateFrom));
    }
    if (options?.dueDateTo) {
      conditions.push(lte(tasks.dueDate, options.dueDateTo));
    }

    const whereClause = and(...conditions)!;

    // Get total count
    const totalCount = await this.count(whereClause);

    // Build order by
    let orderBy: SQL[];
    const orderFn = options?.sortOrder === 'asc' ? asc : desc;

    switch (options?.sortBy) {
      case 'updatedAt':
        orderBy = [orderFn(tasks.updatedAt)];
        break;
      case 'dueDate':
        orderBy = [orderFn(tasks.dueDate)];
        break;
      case 'priority':
        orderBy = [orderFn(tasks.priority)];
        break;
      default:
        orderBy = [orderFn(tasks.createdAt)];
    }

    // Get paginated items
    const items = await this.findMany(whereClause, {
      orderBy,
      limit: options?.limit,
      offset: options?.offset,
    });

    return { items, totalCount };
  }

  /**
   * 按状态分组获取用户任务（用于看板视图）
   */
  async findByUserIdGroupedByStatus(userId: number): Promise<Record<string, TaskEntity[]>> {
    const items = await this.findMany(eq(tasks.userId, userId), {
      orderBy: [desc(tasks.createdAt)],
    });

    const grouped: Record<string, TaskEntity[]> = {
      pending: [],
      in_progress: [],
      completed: [],
      cancelled: [],
    };

    for (const item of items) {
      if (item.status in grouped) {
        grouped[item.status].push(item);
      }
    }

    return grouped;
  }

  /**
   * 查询已过期但未标记为 expired 的任务
   */
  async findExpiredPendingTasks(): Promise<TaskEntity[]> {
    const now = new Date();
    return this.findMany(
      and(
        eq(tasks.status, 'pending'),
        lte(tasks.dueDate, now),
        isNull(tasks.deletedAt),
      )!,
    );
  }

  // ============== Update Operations ==============

  /**
   * 根据ID和用户ID更新任务
   */
  async updateByIdAndUserId(taskId: number, userId: number, data: UpdateTaskData): Promise<TaskEntity | null> {
    await db
      .update(tasks)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

    return this.findByIdAndUserId(taskId, userId);
  }

  /**
   * 批量标记过期任务
   */
  async markTasksAsExpired(taskIds: number[]): Promise<void> {
    if (taskIds.length === 0) return;

    await db
      .update(tasks)
      .set({
        status: 'expired' as TaskStatus,
        updatedAt: new Date(),
      })
      .where(inArray(tasks.id, taskIds));
  }

  // ============== Delete Operations ==============

  /**
   * 根据ID和用户ID软删除任务
   */
  async deleteByIdAndUserId(taskId: number, userId: number): Promise<boolean> {
    try {
      await db
        .update(tasks)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton export
export const taskRepository = new TaskRepository();
