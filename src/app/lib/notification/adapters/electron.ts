import type { NotificationAdapter, NotificationPayload } from '../types';

interface ElectronNotificationAPI {
  showNativeNotification: (options: {
    title: string;
    body: string;
    link?: string;
    actions?: Array<{ id: string; label: string }>;
  }) => Promise<void>;
  setBadgeCount: (count: number) => Promise<void>;
  clearBadgeCount: () => Promise<void>;
  onNotificationClick: (callback: (link?: string) => void) => void;
}

export class ElectronAdapter implements NotificationAdapter {
  readonly name = 'electron';

  canHandle(): boolean {
    return (
      typeof window !== 'undefined' &&
      !!(window as any).electronAPI?.notification
    );
  }

  private getApi(): ElectronNotificationAPI | null {
    if (!this.canHandle()) return null;
    return (window as any).electronAPI.notification as ElectronNotificationAPI;
  }

  show(payload: NotificationPayload): void {
    const api = this.getApi();
    if (!api) return;

    const { title, message, link, actions } = payload;

    api.showNativeNotification({
      title,
      body: message || '',
      link,
      actions: actions?.map(a => ({ id: a.id, label: a.label })),
    }).catch((err: any) => {
      console.warn('[ElectronAdapter] Failed to show native notification:', err);
    });
  }

  async setBadgeCount(count: number): Promise<void> {
    const api = this.getApi();
    if (!api) return;

    try {
      if (count > 0) {
        await api.setBadgeCount(count);
      } else {
        await api.clearBadgeCount();
      }
    } catch (err) {
      console.warn('[ElectronAdapter] Failed to set badge count:', err);
    }
  }

  onNotificationClick(callback: (link?: string) => void): void {
    const api = this.getApi();
    if (!api) return;
    api.onNotificationClick(callback);
  }

  requestPermission?(): Promise<boolean> {
    return Promise.resolve(true);
  }
}
