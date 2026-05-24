/**
 * Task Business Logic
 *
 * 纯业务函数，无框架耦合。供 Agent 工具调用。
 */
import taskService from '@server/service/taskService';
import authService from '@server/service/authService';
import logger from '@server/base/logger';
import type { TaskStatus, TaskPriority, TaskType, TaskSourceType } from '@/types/task';

/**
 * 创建投资任务
 */
export async function createTask(
  title: string,
  options?: {
    description?: string;
    type?: TaskType;
    priority?: TaskPriority;
    linkedSymbols?: string[];
    dueDate?: string;
    sourceType?: TaskSourceType;
  },
): Promise<string> {
  const userId = await authService.getCurrentUserId();
  if (!userId) {
    throw new Error('用户未登录，无法创建任务');
  }

  logger.info(`[business/task] createTask: ${title}`);
  try {
    const task = await taskService.createTask(userId, {
      title,
      description: options?.description ?? null,
      type: options?.type ?? 'one_time',
      priority: options?.priority ?? 'medium',
      linkedSymbols: options?.linkedSymbols ?? [],
      dueDate: options?.dueDate ?? null,
      sourceType: options?.sourceType ?? 'agent_chat',
    });
    return `任务创建成功！\nID: ${task.id}\n标题: ${task.title}\n类型: ${task.type}\n优先级: ${task.priority}\n状态: ${task.status}${task.dueDate ? `\n截止日期: ${new Date(task.dueDate).toISOString().slice(0, 10)}` : ''}${task.linkedSymbols.length > 0 ? `\n关联资产: ${task.linkedSymbols.join(', ')}` : ''}`;
  } catch (e) {
    throw new Error(`任务创建失败: ${(e as Error).message}`);
  }
}

/**
 * 列出当前用户的任务
 */
export async function listTasks(
  options?: {
    status?: TaskStatus;
    priority?: TaskPriority;
    search?: string;
    limit?: number;
    offset?: number;
  },
): Promise<string> {
  const userId = await authService.getCurrentUserId();
  if (!userId) {
    throw new Error('用户未登录，无法获取任务列表');
  }

  logger.info(`[business/task] listTasks: userId=${userId}`);
  try {
    const { items, total } = await taskService.listTasks(userId, {
      status: options?.status,
      priority: options?.priority,
      search: options?.search,
    }, {
      limit: options?.limit ?? 20,
      offset: options?.offset ?? 0,
    });

    if (items.length === 0) {
      return '未找到任何任务。';
    }

    const lines = items.map((task) => {
      const symbols = task.linkedSymbols.length > 0 ? ` [${task.linkedSymbols.join(', ')}]` : '';
      const due = task.dueDate ? ` 截止: ${new Date(task.dueDate).toISOString().slice(0, 10)}` : '';
      return `[${task.id}] [${task.status}] [${task.priority}] ${task.title}${symbols}${due}`;
    });

    return `共 ${total} 条任务，当前页 ${items.length} 条:\n${lines.join('\n')}`;
  } catch (e) {
    throw new Error(`任务列表获取失败: ${(e as Error).message}`);
  }
}

/**
 * 更新任务（状态变更、内容更新）
 */
export async function updateTask(
  taskId: string,
  options?: {
    status?: TaskStatus;
    title?: string;
    description?: string;
    priority?: TaskPriority;
    executionNotes?: string;
    linkedSymbols?: string[];
  },
): Promise<string> {
  const userId = await authService.getCurrentUserId();
  if (!userId) {
    throw new Error('用户未登录，无法更新任务');
  }

  logger.info(`[business/task] updateTask: ${taskId}`);
  try {
    const { task, error } = await taskService.updateTask(taskId, userId, {
      status: options?.status,
      title: options?.title,
      description: options?.description,
      priority: options?.priority,
      executionNotes: options?.executionNotes,
      linkedSymbols: options?.linkedSymbols,
    });

    if (error === 'task_not_found') {
      return `未找到 ID 为 ${taskId} 的任务，或无权更新。`;
    }
    if (error) {
      return `任务更新失败: ${error}`;
    }

    return `任务更新成功！\nID: ${task!.id}\n标题: ${task!.title}\n状态: ${task!.status}\n优先级: ${task!.priority}`;
  } catch (e) {
    throw new Error(`任务更新失败: ${(e as Error).message}`);
  }
}
