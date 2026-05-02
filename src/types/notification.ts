import { z } from 'zod';

// 通知类型枚举
export const NotificationTypeEnum = [
  'report_completed',
  'analysis_completed',
  'data_refreshed',
  'system_announcement',
  'trade_executed',
  'price_alert',
] as const;

// 优先级枚举
export const NotificationPriorityEnum = ['low', 'medium', 'high', 'urgent'] as const;

// 类型别名
export type NotificationTypeValue = typeof NotificationTypeEnum[number];
export type NotificationPriorityValue = typeof NotificationPriorityEnum[number];

// 通知 Schema
export const NotificationSchema = z.object({
  id: z.number(),
  userId: z.number(),
  type: z.enum(NotificationTypeEnum),
  title: z.string(),
  message: z.string(),
  data: z.string().optional(), // JSON 字符串
  isRead: z.boolean(),
  priority: z.enum(NotificationPriorityEnum),
  link: z.string().optional(),
  createdAt: z.date(),
  readAt: z.date().optional(),
});

export type Notification = z.infer<typeof NotificationSchema>;

// 创建通知请求 Schema
export const CreateNotificationRequestSchema = z.object({
  type: z.enum(NotificationTypeEnum),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  data: z.record(z.any()).optional(), // 任意 JSON 对象
  priority: z.enum(NotificationPriorityEnum).default('medium'),
  link: z.string().optional(),
  userId: z.number().optional(), // 如果不提供，则使用当前用户
});

export type CreateNotificationRequestType = z.infer<typeof CreateNotificationRequestSchema>;

// 获取通知列表请求 Schema
export const GetNotificationsRequestSchema = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(20),
  isRead: z.enum(['all', 'read', 'unread']).default('all'),
  type: z.enum(NotificationTypeEnum).optional(),
  priority: z.enum(NotificationPriorityEnum).optional(),
});

export type GetNotificationsRequestType = z.infer<typeof GetNotificationsRequestSchema>;

// 标记通知已读请求 Schema
export const MarkReadRequestSchema = z.object({
  id: z.coerce.number(),
});

export type MarkReadRequestType = z.infer<typeof MarkReadRequestSchema>;

// 批量标记已读响应
export const MarkAllReadResponseSchema = z.object({
  count: z.number(),
});

export type MarkAllReadResponseType = z.infer<typeof MarkAllReadResponseSchema>;

// 删除通知请求 Schema
export const DeleteNotificationRequestSchema = z.object({
  id: z.coerce.number(),
});

export type DeleteNotificationRequestType = z.infer<typeof DeleteNotificationRequestSchema>;

// 通知列表响应 Schema
export const NotificationListResponseSchema = z.object({
  items: z.array(NotificationSchema),
  totalCount: z.number(),
  unreadCount: z.number(),
  totalPages: z.number(),
  currentPage: z.number(),
});

export type NotificationListResponseType = z.infer<typeof NotificationListResponseSchema>;

// 通知统计数据 Schema
export const NotificationStatsSchema = z.object({
  totalCount: z.number(),
  unreadCount: z.number(),
  unreadByType: z.record(z.number()), // { [type]: count }
  unreadByPriority: z.record(z.number()), // { [priority]: count }
});

export type NotificationStatsType = z.infer<typeof NotificationStatsSchema>;

// 通知偏好设置 Schema
export const NotificationPreferencesSchema = z.object({
  osNotificationsEnabled: z.boolean().default(true),
  soundEnabled: z.boolean().default(false),
  types: z.record(z.boolean()).default({}),
});

export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

// 通知数据解析 helper 类型
export interface NotificationData {
  reportId?: string;
  symbol?: string;
  accountId?: string;
  transactionId?: string;
  analysisType?: string;
  [key: string]: any;
}
