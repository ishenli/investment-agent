import { notificationManager } from './manager';
import { ElectronAdapter } from './adapters/electron';
import { WebAdapter } from './adapters/web';
import { ToastAdapter } from './adapters/toast';

let initialized = false;

export function initializeNotifications(): void {
  if (initialized) return;
  if (typeof window === 'undefined') return;

  notificationManager.registerAdapter(new ElectronAdapter());
  notificationManager.registerAdapter(new WebAdapter());
  notificationManager.registerAdapter(new ToastAdapter());

  initialized = true;
}

export function resetNotificationInit(): void {
  initialized = false;
}
