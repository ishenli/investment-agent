import type { NotificationAdapter, NotificationPayload } from './types';

export class NotificationManager {
  private static instance: NotificationManager;
  private adapters: NotificationAdapter[] = [];

  private constructor() {}

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  static resetForTesting(): void {
    NotificationManager.instance = new NotificationManager();
  }

  registerAdapter(adapter: NotificationAdapter): void {
    this.adapters.push(adapter);
  }

  private getToastAdapter(): NotificationAdapter | undefined {
    return this.adapters.find(a => a.name === 'toast' && a.canHandle());
  }

  private getNativeAdapters(): NotificationAdapter[] {
    return this.adapters.filter(a => a.name !== 'toast' && a.canHandle());
  }

  /**
   * Show a notification through the appropriate adapter.
   * @param payload The notification to display.
   */
  notify(payload: NotificationPayload): void {
    const toastAdapter = this.getToastAdapter();

    if (payload.category === 'transient') {
      if (toastAdapter) {
        try {
          toastAdapter.show(payload);
        } catch (error) {
          console.warn('[NotificationManager] Toast adapter failed:', error);
        }
      }
      return;
    }

    const nativeAdapters = this.getNativeAdapters();

    for (const adapter of nativeAdapters) {
      try {
        adapter.show(payload);
        break;
      } catch (error) {
        console.warn(`[NotificationManager] Adapter "${adapter.name}" failed:`, error);
      }
    }

    if (toastAdapter) {
      try {
        toastAdapter.show(payload);
      } catch (error) {
        console.warn('[NotificationManager] Toast adapter failed:', error);
      }
    }
  }

  /**
   * Show a transient (in-app only) toast notification.
   */
  toast(payload: Omit<NotificationPayload, 'category'>): void {
    this.notify({ ...payload, category: 'transient' });
  }

  /**
   * Request permission for the first available non-toast adapter.
   */
  async requestPermission(): Promise<boolean> {
    const nativeAdapters = this.getNativeAdapters();

    for (const adapter of nativeAdapters) {
      if (adapter.requestPermission) {
        try {
          const granted = await adapter.requestPermission();
          if (granted) return true;
        } catch (error) {
          console.warn(`[NotificationManager] Permission request failed for "${adapter.name}":`, error);
        }
      }
    }
    return false;
  }

  getAdapters(): NotificationAdapter[] {
    return [...this.adapters];
  }
}

export const notificationManager = NotificationManager.getInstance();
