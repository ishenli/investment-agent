import type { NotificationAdapter, NotificationPayload, NotificationPermissionState } from '../types';

export class WebAdapter implements NotificationAdapter {
  readonly name = 'web';

  private getNotificationClass(): typeof Notification | undefined {
    if (typeof globalThis !== 'undefined' && 'Notification' in globalThis) {
      return (globalThis as any).Notification;
    }
    return undefined;
  }

  canHandle(): boolean {
    return !!this.getNotificationClass();
  }

  getPermissionState(): NotificationPermissionState {
    const NotificationClass = this.getNotificationClass();
    if (!NotificationClass) {
      return 'unsupported';
    }
    return NotificationClass.permission as NotificationPermissionState;
  }

  async requestPermission(): Promise<boolean> {
    if (!this.canHandle()) return false;

    const state = this.getPermissionState();
    if (state === 'granted') return true;
    if (state === 'denied') return false;

    try {
      const NotificationClass = this.getNotificationClass();
      const result = await NotificationClass!.requestPermission();
      return result === 'granted';
    } catch {
      return false;
    }
  }

  show(payload: NotificationPayload): void {
    if (!this.canHandle()) return;

    const permission = this.getPermissionState();
    if (permission !== 'granted') {
      return;
    }

    const { title, message, link, actions } = payload;

    const NotificationClass = this.getNotificationClass();
    if (!NotificationClass) return;

    const notificationOptions: NotificationOptions = {
      body: message,
      icon: '/icon.png',
      requireInteraction: payload.priority === 'urgent',
    };

    if (actions && actions.length > 0 && 'actions' in NotificationClass.prototype) {
      (notificationOptions as any).actions = actions.map(a => ({
        action: a.id,
        title: a.label,
      }));
    }

    const notification = new NotificationClass(title, notificationOptions);

    notification.onclick = () => {
      if (typeof window !== 'undefined') {
        window.focus();
      }
      if (link && typeof window !== 'undefined') {
        window.location.href = link;
      }
      notification.close();
    };

    if (payload.priority !== 'urgent') {
      setTimeout(() => notification.close(), 8000);
    }
  }
}
