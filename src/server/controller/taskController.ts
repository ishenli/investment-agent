/**
 * Task Controller
 *
 * 继承 BaseBizController，暴露任务 CRUD 方法
 */
import { WithRequestContext } from '../base/decorators';
import authService from '../service/authService';
import taskService from '../service/taskService';
import { BaseBizController } from './base';
import type { CreateTaskInput, UpdateTaskInput, TaskFilters, TaskPagination } from '@/types/task';

export class TaskController extends BaseBizController {
  @WithRequestContext()
  async listTasks(param: {
    status?: string;
    priority?: string;
    type?: string;
    search?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
    limit?: string;
    offset?: string;
    grouped?: string;
  }) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      // Kanban grouped view
      if (param.grouped === 'true') {
        const result = await taskService.getTasksByStatus(userId);
        return this.success(result);
      }

      // List view with filters
      const filters: TaskFilters = {};
      if (param.status) {
        const statuses = param.status.split(',');
        filters.status = statuses.length === 1 ? statuses[0] as any : statuses as any;
      }
      if (param.priority) {
        const priorities = param.priority.split(',');
        filters.priority = priorities.length === 1 ? priorities[0] as any : priorities as any;
      }
      if (param.type) filters.type = param.type as any;
      if (param.search) filters.search = param.search;
      if (param.dueDateFrom) filters.dueDateFrom = param.dueDateFrom;
      if (param.dueDateTo) filters.dueDateTo = param.dueDateTo;

      const pagination: TaskPagination = {
        limit: param.limit ? parseInt(param.limit) : 20,
        offset: param.offset ? parseInt(param.offset) : 0,
      };

      const result = await taskService.listTasks(userId, filters, pagination);
      return this.success(result);
    } catch (error) {
      return this.error('获取任务列表失败', 'list_tasks_error');
    }
  }

  @WithRequestContext()
  async getTaskById(param: { id: string }) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      if (!param.id) {
        return this.error('任务ID不能为空', 'validation_error');
      }

      const task = await taskService.getTaskById(param.id, userId);
      if (!task) {
        return this.error('任务不存在', 'task_not_found');
      }

      return this.success(task);
    } catch (error) {
      return this.error('获取任务详情失败', 'get_task_error');
    }
  }

  @WithRequestContext()
  async createTask(body: CreateTaskInput) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      if (!body.title || body.title.trim() === '') {
        return this.error('标题不能为空', 'validation_error');
      }

      if (body.title.length > 200) {
        return this.error('标题不能超过200个字符', 'validation_error');
      }

      const task = await taskService.createTask(userId, {
        title: body.title.trim(),
        description: body.description === '' ? null : body.description,
        type: body.type,
        priority: body.priority,
        linkedSymbols: body.linkedSymbols,
        triggerPrice: body.triggerPrice,
        triggerDirection: body.triggerDirection,
        dueDate: body.dueDate === '' ? null : body.dueDate,
        sourceType: body.sourceType,
        sourceId: body.sourceId === '' ? null : body.sourceId,
      });

      return this.success(task);
    } catch (error) {
      return this.error('创建任务失败', 'create_task_error');
    }
  }

  @WithRequestContext()
  async updateTask(body: UpdateTaskInput & { id: string }) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      if (!body.id) {
        return this.error('任务ID不能为空', 'validation_error');
      }

      if (body.title !== undefined && body.title.trim() === '') {
        return this.error('标题不能为空', 'validation_error');
      }

      if (body.title !== undefined && body.title.length > 200) {
        return this.error('标题不能超过200个字符', 'validation_error');
      }

      const { task, error } = await taskService.updateTask(body.id, userId, {
        title: body.title,
        description: body.description === '' ? null : body.description,
        status: body.status,
        type: body.type,
        priority: body.priority,
        linkedSymbols: body.linkedSymbols,
        triggerPrice: body.triggerPrice,
        triggerDirection: body.triggerDirection,
        dueDate: body.dueDate === '' ? null : body.dueDate,
      });

      if (error === 'task_not_found') {
        return this.error('任务不存在', 'task_not_found');
      }
      if (error) {
        return this.error(error, 'invalid_status_transition');
      }

      return this.success(task!);
    } catch (error) {
      return this.error('更新任务失败', 'update_task_error');
    }
  }

  @WithRequestContext()
  async deleteTask(param: { id: string }) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      if (!param.id) {
        return this.error('任务ID不能为空', 'validation_error');
      }

      const result = await taskService.deleteTask(param.id, userId);
      if (!result) {
        return this.error('任务不存在或无权限删除', 'delete_task_error');
      }

      return this.success({ message: '删除成功' });
    } catch (error) {
      return this.error('删除任务失败', 'delete_task_error');
    }
  }

  @WithRequestContext()
  async markExpired() {
    try {
      const count = await taskService.markExpiredTasks();
      return this.success({ expiredCount: count });
    } catch (error) {
      return this.error('标记过期任务失败', 'mark_expired_error');
    }
  }
}
