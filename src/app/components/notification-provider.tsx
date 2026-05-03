'use client';

import { ReactNode } from 'react';
import { useNotifications } from '@/app/hooks/useNotifications';

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  // Mount the notification polling hook; it does not render UI
  useNotifications();

  return <>{children}</>;
}
