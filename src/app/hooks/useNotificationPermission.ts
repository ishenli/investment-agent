'use client';

import { useState, useEffect, useCallback } from 'react';
import { WebAdapter } from '@/app/lib/notification/adapters/web';
import type { NotificationPermissionState } from '@/app/lib/notification/types';

const PERMISSION_STORAGE_KEY = 'notification-permission-decision';

export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermissionState>('unsupported');

  useEffect(() => {
    const adapter = new WebAdapter();
    const state = adapter.getPermissionState();
    setPermission(state);
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const adapter = new WebAdapter();
    const canHandle = adapter.canHandle();

    if (!canHandle) {
      return false;
    }

    const currentState = adapter.getPermissionState();

    if (currentState === 'granted') {
      setPermission('granted');
      return true;
    }

    if (currentState === 'denied') {
      setPermission('denied');
      return false;
    }

    // For 'default', request permission
    const granted = await adapter.requestPermission();
    const newState = adapter.getPermissionState();
    setPermission(newState);

    return granted;
  }, []);

  return {
    permission,
    requestPermission,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    isDefault: permission === 'default',
    isUnsupported: permission === 'unsupported',
  };
}
