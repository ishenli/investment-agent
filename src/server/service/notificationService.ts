import notificationRepository from '../repository/notificationRepository';
import type {
  CreateNotificationRequestType,
  GetNotificationsRequestType,
  Notification,
  NotificationStatsType,
} from '@/types/notification';

class NotificationService {
  /**
   * 创建新通知
   */
  async createNotification(
    userId: number,
    request: CreateNotificationRequestType,
  ): Promise<Notification> {
    const entity = await notificationRepository.create(userId, request);
    return this.entityToType(entity);
  }

  /**
   * 获取通知列表
   */
  async getNotifications(
    userId: number,
    request: GetNotificationsRequestType,
  ): Promise<{
    items: Notification[];
    totalCount: number;
    unreadCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { items, totalCount } = await notificationRepository.findMany({
      userId,
      page: request.page,
      pageSize: request.pageSize,
      isRead: request.isRead,
      type: request.type,
      priority: request.priority,
    });

    const unreadCount = await notificationRepository.getUnreadCount(userId);
    const totalPages = Math.ceil(totalCount / request.pageSize);

    return {
      items: items.map((entity) => this.entityToType(entity)),
      totalCount,
      unreadCount,
      totalPages,
      currentPage: request.page,
    };
  }

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(userId: number): Promise<number> {
    return notificationRepository.getUnreadCount(userId);
  }

  /**
   * 获取通知统计
   */
  async getStats(userId: number): Promise<NotificationStatsType> {
    const stats = await notificationRepository.getStats(userId);
    return {
      totalCount: stats.totalCount,
      unreadCount: stats.unreadCount,
      unreadByType: stats.unreadByType,
      unreadByPriority: stats.unreadByPriority,
    };
  }

  /**
   * 根据 ID 获取通知
   */
  async getById(id: number): Promise<Notification | null> {
    const entity = await notificationRepository.findById(id);
    return entity ? this.entityToType(entity) : null;
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(id: number): Promise<Notification | null> {
    const entity = await notificationRepository.markAsRead(id);
    return entity ? this.entityToType(entity) : null;
  }

  /**
   * 批量标记所有通知为已读
   */
  async markAllAsRead(userId: number): Promise<number> {
    return notificationRepository.markAllAsRead(userId);
  }

  /**
   * 删除通知
   */
  async deleteNotification(id: number): Promise<boolean> {
    return notificationRepository.delete(id);
  }

  /**
   * 删除所有已读通知
   */
  async deleteAllRead(userId: number): Promise<number> {
    return notificationRepository.deleteAllRead(userId);
  }

  /**
   * 转换 entity 到 type
   */
  private entityToType(entity: {
    id: number;
    userId: number;
    type: any;
    title: string;
    message: string;
    data: string | null;
    isRead: boolean;
    priority: any;
    link: string | null;
    createdAt: Date;
    readAt: Date | null;
  }): Notification {
    return {
      id: entity.id,
      userId: entity.userId,
      type: entity.type,
      title: entity.title,
      message: entity.message,
      data: entity.data ?? undefined,
      isRead: entity.isRead,
      priority: entity.priority,
      link: entity.link ?? undefined,
      createdAt: entity.createdAt,
      readAt: entity.readAt ?? undefined,
    };
  }
}

export default new NotificationService();
