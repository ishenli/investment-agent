import type {
  NotificationTypeValue,
  NotificationPriorityValue,
} from '@/types/notification';

export type NotificationCategory = 'persistent' | 'transient';

export interface NotificationAction {
  id: string;
  label: string;
}

export interface NotificationPayload {
  id?: string | number;
  title: string;
  message?: string;
  type?: NotificationTypeValue;
  priority?: NotificationPriorityValue;
  category: NotificationCategory;
  variant?: 'success' | 'error' | 'warning' | 'info' | 'default';
  link?: string;
  data?: Record<string, any>;
  actions?: NotificationAction[];
}

export interface NotificationAdapter {
  readonly name: string;
  canHandle(): boolean;
  show(payload: NotificationPayload): void;
  requestPermission?(): Promise<boolean>;
}

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';
