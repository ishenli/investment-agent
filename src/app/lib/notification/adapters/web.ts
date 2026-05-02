import type { NotificationAdapter, NotificationPayload, NotificationPermissionState } from '../types';

export class WebAdapter implements NotificationAdapter {
  readonly name = 'web';

  canHandle(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  getPermissionState(): NotificationPermissionState {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return window.Notification.permission as NotificationPermissionState;
  }

  async requestPermission(): Promise<boolean> {
    if (!this.canHandle()) return false;

    const state = this.getPermissionState();
    if (state === 'granted') return true;
    if (state === 'denied') return false;

    try {
      const result = await window.Notification.requestPermission();
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

    const notificationOptions: NotificationOptions = {
      body: message,
      icon: '/icon.png',
      requireInteraction: payload.priority === 'urgent',
    };

    if (actions && actions.length > 0 && 'actions' in Notification.prototype) {
      (notificationOptions as any).actions = actions.map(a => ({
        action: a.id,
        title: a.label,
      }));
    }

    const notification = new window.Notification(title, notificationOptions);

    notification.onclick = () => {
      window.focus();
      if (link) {
        window.location.href = link;
      }
      notification.close();
    };

    if (payload.priority !== 'urgent') {
      setTimeout(() => notification.close(), 8000);
    }
  }
}
