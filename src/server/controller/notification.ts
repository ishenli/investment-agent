import { WithRequestContext } from '@server/base/decorators';
import { BaseBizController } from './base';
import notificationService from '../service/notificationService';
import authService from '../service/authService';
import logger from '@server/base/logger';
import type {
  CreateNotificationRequestType,
  GetNotificationsRequestType,
  MarkReadRequestType,
  DeleteNotificationRequestType,
} from '@/types/notification';
import {
  CreateNotificationRequestSchema,
  GetNotificationsRequestSchema,
  MarkReadRequestSchema,
  DeleteNotificationRequestSchema,
} from '@/types/notification';

export class NotificationBizController extends BaseBizController {
  /**
   * 获取通知列表
   */
  @WithRequestContext()
  async getNotifications(query: Record<string, unknown>) {
    try {
      const userIdStr = await authService.getCurrentUserId();
      if (!userIdStr) {
        return this.error('用户未登录', 'unauthorized');
      }
      const userId = parseInt(userIdStr);

      // 参数验证
      const validationResult = GetNotificationsRequestSchema.safeParse({
        page: query.page || 1,
        pageSize: query.pageSize || 20,
        isRead: query.isRead || 'all',
        type: query.type,
        priority: query.priority,
      });

      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }

      const params = validationResult.data;
      const result = await notificationService.getNotifications(userId, params);

      return this.success(result);
    } catch (error) {
      logger.error('[NotificationBizController] 获取通知列表失败:', error);
      return this.error('获取通知列表失败', 'get_notifications_error');
    }
  }

  /**
   * 创建通知
   */
  @WithRequestContext()
  async createNotification(body: CreateNotificationRequestType) {
    try {
      const userIdStr = await authService.getCurrentUserId();
      if (!userIdStr) {
        return this.error('用户未登录', 'unauthorized');
      }
      const userId = parseInt(userIdStr);

      // 参数验证
      const validationResult = CreateNotificationRequestSchema.safeParse(body);
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }

      const params = validationResult.data;
      // 如果请求中指定了 userId，使用请求的 userId（管理员功能）
      // 否则使用当前登录用户的 ID
      const targetUserId = params.userId || userId;

      const result = await notificationService.createNotification(targetUserId, params);

      return this.success(result);
    } catch (error) {
      logger.error('[NotificationBizController] 创建通知失败:', error);
      return this.error('创建通知失败', 'create_notification_error');
    }
  }

  /**
   * 标记通知为已读
   */
  @WithRequestContext()
  async markAsRead(params: MarkReadRequestType) {
    try {
      const userIdStr = await authService.getCurrentUserId();
      if (!userIdStr) {
        return this.error('用户未登录', 'unauthorized');
      }
      const userId = parseInt(userIdStr);

      // 参数验证
      const validationResult = MarkReadRequestSchema.safeParse(params);
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }

      const { id } = validationResult.data;

      // 验证通知是否属于当前用户
      const notification = await notificationService.getById(id);
      if (!notification) {
        return this.error('通知不存在', 'notification_not_found');
      }
      if (notification.userId !== userId) {
        return this.error('无权访问此通知', 'forbidden');
      }

      const result = await notificationService.markAsRead(id);

      return this.success({ count: result ? 1 : 0 });
    } catch (error) {
      logger.error('[NotificationBizController] 标记通知已读失败:', error);
      return this.error('标记已读失败', 'mark_read_error');
    }
  }

  /**
   * 批量标记所有通知为已读
   */
  @WithRequestContext()
  async markAllAsRead() {
    try {
      const userIdStr = await authService.getCurrentUserId();
      if (!userIdStr) {
        return this.error('用户未登录', 'unauthorized');
      }
      const userId = parseInt(userIdStr);

      const count = await notificationService.markAllAsRead(userId);

      return this.success({ count });
    } catch (error) {
      logger.error('[NotificationBizController] 批量标记已读失败:', error);
      return this.error('批量标记已读失败', 'mark_all_read_error');
    }
  }

  /**
   * 删除通知
   */
  @WithRequestContext()
  async deleteNotification(params: DeleteNotificationRequestType) {
    try {
      const userIdStr = await authService.getCurrentUserId();
      if (!userIdStr) {
        return this.error('用户未登录', 'unauthorized');
      }
      const userId = parseInt(userIdStr);

      // 参数验证
      const validationResult = DeleteNotificationRequestSchema.safeParse(params);
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }

      const { id } = validationResult.data;

      // 验证通知是否属于当前用户
      const notification = await notificationService.getById(id);
      if (!notification) {
        return this.error('通知不存在', 'notification_not_found');
      }
      if (notification.userId !== userId) {
        return this.error('无权访问此通知', 'forbidden');
      }

      const success = await notificationService.deleteNotification(id);

      return this.success({ success });
    } catch (error) {
      logger.error('[NotificationBizController] 删除通知失败:', error);
      return this.error('删除通知失败', 'delete_notification_error');
    }
  }

  /**
   * 获取通知统计
   */
  @WithRequestContext()
  async getStats() {
    try {
      const userIdStr = await authService.getCurrentUserId();
      if (!userIdStr) {
        return this.error('用户未登录', 'unauthorized');
      }
      const userId = parseInt(userIdStr);

      const stats = await notificationService.getStats(userId);

      return this.success(stats);
    } catch (error) {
      logger.error('[NotificationBizController] 获取通知统计失败:', error);
      return this.error('获取通知统计失败', 'get_stats_error');
    }
  }

  /**
   * 获取未读通知数量（用于导航栏红点提示）
   */
  @WithRequestContext()
  async getUnreadCount() {
    try {
      const userIdStr = await authService.getCurrentUserId();
      if (!userIdStr) {
        return this.error('用户未登录', 'unauthorized');
      }
      const userId = parseInt(userIdStr);

      const count = await notificationService.getUnreadCount(userId);

      return this.success({ count });
    } catch (error) {
      logger.error('[NotificationBizController] 获取未读数量失败:', error);
      return this.error('获取未读数量失败', 'get_unread_count_error');
    }
  }
}

export default new NotificationBizController();
