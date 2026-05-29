/**
 * Task Service
 *
 * 业务逻辑层：任务管理（CRUD、状态流转、过期标记）
 */
import logger from '@server/base/logger';
import { taskRepository, TaskEntity, type UpdateTaskData } from '@server/repository/taskRepository';
import type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskType,
  TaskSourceType,
  TriggerDirection,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilters,
  TaskPagination,
  TaskListResponse,
  TasksByStatusResponse,
} from '@/types/task';


// ============== Entity → DTO Transform ==============

function toTaskResponse(entity: TaskEntity): Task {
  return {
    id: entity.id.toString(),
    userId: entity.userId.toString(),
    title: entity.title,
    description: entity.description,
    status: entity.status as TaskStatus,
    type: entity.type as TaskType,
    priority: entity.priority as TaskPriority,
    linkedSymbols: Array.isArray(entity.linkedSymbols) ? entity.linkedSymbols : [],
    triggerPrice: entity.triggerPrice,
    triggerDirection: entity.triggerDirection as TriggerDirection | null,
    triggerExecutedAt: entity.triggerExecutedAt,
    dueDate: entity.dueDate,
    completedAt: entity.completedAt,
    sourceType: entity.sourceType as TaskSourceType,
    sourceId: entity.sourceId,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

// ============== Service Class ==============

export class TaskService {
  // ============== Create ==============

  async createTask(userId: string, input: CreateTaskInput): Promise<Task> {
    try {
      const entity = await taskRepository.create({
        userId: parseInt(userId),
        title: input.title,
        description: input.description ?? null,
        status: 'pending',
        type: input.type ?? 'one_time',
        priority: input.priority ?? 'medium',
        linkedSymbols: input.linkedSymbols ?? [],
        triggerPrice: input.triggerPrice ?? null,
        triggerDirection: input.triggerDirection ?? null,
        triggerExecutedAt: null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        completedAt: null,
        sourceType: input.sourceType ?? 'manual',
        sourceId: input.sourceId ?? null,
        deletedAt: null,
        executionNotes: null,
      });

      logger.info(`[TaskService] Task created: id=${entity.id}, userId=${userId}`);
      return toTaskResponse(entity);
    } catch (error) {
      logger.error(`[TaskService] Failed to create task: ${error}`);
      throw error;
    }
  }

  // ============== Read ==============

  async getTaskById(taskId: string, userId: string): Promise<Task | null> {
    try {
      const entity = await taskRepository.findByIdAndUserId(
        parseInt(taskId),
        parseInt(userId),
      );
      return entity ? toTaskResponse(entity) : null;
    } catch (error) {
      logger.error(`[TaskService] Failed to get task ${taskId}: ${error}`);
      return null;
    }
  }

  async listTasks(
    userId: string,
    filters?: TaskFilters,
    pagination?: TaskPagination,
  ): Promise<TaskListResponse> {
    try {
      const { items, totalCount } = await taskRepository.findByUserId(
        parseInt(userId),
        {
          limit: pagination?.limit ?? 20,
          offset: pagination?.offset ?? 0,
          status: filters?.status,
          priority: filters?.priority,
          type: filters?.type,
          search: filters?.search,
          dueDateFrom: filters?.dueDateFrom ? new Date(filters.dueDateFrom) : undefined,
          dueDateTo: filters?.dueDateTo ? new Date(filters.dueDateTo) : undefined,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        },
      );

      return {
        items: items.map(toTaskResponse),
        total: totalCount,
      };
    } catch (error) {
      logger.error(`[TaskService] Failed to list tasks: ${error}`);
      return { items: [], total: 0 };
    }
  }

  async getTasksByStatus(userId: string): Promise<TasksByStatusResponse> {
    try {
      const grouped = await taskRepository.findByUserIdGroupedByStatus(parseInt(userId));
      return {
        pending: (grouped.pending || []).map(toTaskResponse),
        in_progress: (grouped.in_progress || []).map(toTaskResponse),
        completed: (grouped.completed || []).map(toTaskResponse),
        cancelled: (grouped.cancelled || []).map(toTaskResponse),
      };
    } catch (error) {
      logger.error(`[TaskService] Failed to get tasks by status: ${error}`);
      return { pending: [], in_progress: [], completed: [], cancelled: [] };
    }
  }

  // ============== Update ==============

  async updateTask(
    taskId: string,
    userId: string,
    input: UpdateTaskInput,
  ): Promise<{ task: Task | null; error?: string }> {
    try {
      // Check existence first
      const existing = await taskRepository.findByIdAndUserId(
        parseInt(taskId),
        parseInt(userId),
      );
      if (!existing) {
        return { task: null, error: 'task_not_found' };
      }


      // Build update data
      const updateData: UpdateTaskData = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description === '' ? null : input.description;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.type !== undefined) updateData.type = input.type;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.linkedSymbols !== undefined) updateData.linkedSymbols = input.linkedSymbols;
      if (input.triggerPrice !== undefined) updateData.triggerPrice = input.triggerPrice;
      if (input.triggerDirection !== undefined) updateData.triggerDirection = input.triggerDirection;
      if (input.dueDate !== undefined) updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
      // Auto-set completedAt when status becomes completed
      if (input.status === 'completed' && existing.status !== 'completed') {
        updateData.completedAt = new Date();
      }

      const entity = await taskRepository.updateByIdAndUserId(
        parseInt(taskId),
        parseInt(userId),
        updateData,
      );

      if (!entity) {
        return { task: null, error: 'update_failed' };
      }

      logger.info(`[TaskService] Task updated: id=${taskId}`);
      return { task: toTaskResponse(entity) };
    } catch (error) {
      logger.error(`[TaskService] Failed to update task ${taskId}: ${error}`);
      throw error;
    }
  }

  // ============== Delete ==============

  async deleteTask(taskId: string, userId: string): Promise<boolean> {
    try {
      const result = await taskRepository.deleteByIdAndUserId(
        parseInt(taskId),
        parseInt(userId),
      );
      if (result) {
        logger.info(`[TaskService] Task deleted: id=${taskId}`);
      }
      return result;
    } catch (error) {
      logger.error(`[TaskService] Failed to delete task ${taskId}: ${error}`);
      return false;
    }
  }

  // ============== Scheduled: Mark Expired ==============

  async markExpiredTasks(): Promise<number> {
    try {
      const expiredTasks = await taskRepository.findExpiredPendingTasks();
      if (expiredTasks.length === 0) return 0;

      const ids = expiredTasks.map((t) => t.id);
      await taskRepository.markTasksAsExpired(ids);

      logger.info(`[TaskService] Marked ${ids.length} tasks as expired`);
      return ids.length;
    } catch (error) {
      logger.error(`[TaskService] Failed to mark expired tasks: ${error}`);
      return 0;
    }
  }
}

const taskService = new TaskService();
export default taskService;
