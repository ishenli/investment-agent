'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { get, request } from '@/app/lib/request';
import { notificationManager } from '@/app/lib/notification/manager';
import { ElectronAdapter } from '@/app/lib/notification/adapters/electron';
import { initializeNotifications } from '@/app/lib/notification/init';
import type { NotificationPayload } from '@/app/lib/notification/types';
import type {
  Notification,
  NotificationListResponseType,
  NotificationTypeValue,
  NotificationPriorityValue,
} from '@/types/notification';

const POLL_INTERVAL_MS = 15000;

const ALWAYS_NATIVE_TYPES: NotificationTypeValue[] = [
  'report_completed',
  'analysis_completed',
  'trade_executed',
  'price_alert',
];

const TRANSIENT_UNLESS_URGENT_TYPES: NotificationTypeValue[] = [
  'data_refreshed',
  'system_announcement',
];

function isNativeEligible(notification: Notification): boolean {
  const { type, priority } = notification;

  if (ALWAYS_NATIVE_TYPES.includes(type)) {
    return priority === 'high' || priority === 'urgent';
  }

  if (TRANSIENT_UNLESS_URGENT_TYPES.includes(type)) {
    return priority === 'high' || priority === 'urgent';
  }

  return priority === 'urgent';
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
  notifyTransient: (payload: Omit<NotificationPayload, 'category'>) => void;
}

export function useNotifications(): UseNotificationsReturn {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const seenIdsRef = useRef<Set<number>>(new Set());

  const updateBadgeCount = useCallback((count: number) => {
    const adapters = notificationManager.getAdapters();
    const electronAdapter = adapters.find(
      (a): a is ElectronAdapter => a.name === 'electron' && a instanceof ElectronAdapter
    );
    if (electronAdapter) {
      electronAdapter.setBadgeCount(count).catch((err: unknown) => {
        console.warn('[useNotifications] Failed to update badge:', err);
      });
    }
  }, []);

  const handleNotificationClick = useCallback(
    (link?: string) => {
      if (link) {
        router.push(link);
      }
    },
    [router]
  );

  const poll = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await get<NotificationListResponseType>('/api/notifications', {
        params: { isRead: 'unread', pageSize: 50 },
      });

      setNotifications(response.items);
      setUnreadCount(response.unreadCount);
      updateBadgeCount(response.unreadCount);

      const newItems = response.items.filter(
        (item) => !seenIdsRef.current.has(item.id)
      );

      for (const item of newItems) {
        seenIdsRef.current.add(item.id);

        const payload: NotificationPayload = {
          id: item.id,
          title: item.title,
          message: item.message,
          type: item.type,
          priority: item.priority,
          category: isNativeEligible(item) ? 'persistent' : 'transient',
          link: item.link,
          actions: [
            { id: 'view', label: '查看' },
            { id: 'mark-as-read', label: '标记已读' },
          ],
        };

        notificationManager.notify(payload);
      }
    } catch (error) {
      console.warn('[useNotifications] Poll failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [updateBadgeCount]);

  const markAsRead = useCallback(async (id: number) => {
    try {
      await request(`/api/notifications/${id}/read`, { method: 'PATCH' });
      seenIdsRef.current.delete(id);
      await poll();
    } catch (error) {
      console.warn('[useNotifications] Mark as read failed:', error);
    }
  }, [poll]);

  const refresh = useCallback(async () => {
    await poll();
  }, [poll]);

  const notifyTransient = useCallback(
    (payload: Omit<NotificationPayload, 'category'>) => {
      notificationManager.toast(payload);
    },
    []
  );

  useEffect(() => {
    initializeNotifications();
    poll();

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [poll]);

  useEffect(() => {
    const adapters = notificationManager.getAdapters();
    const electronAdapter = adapters.find(
      (a): a is ElectronAdapter => a.name === 'electron' && a instanceof ElectronAdapter
    );
    if (electronAdapter) {
      electronAdapter.onNotificationClick(handleNotificationClick);
    }
  }, [handleNotificationClick]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    refresh,
    notifyTransient,
  };
}
