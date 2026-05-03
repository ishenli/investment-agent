// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationManager } from '../manager';
import { ToastAdapter } from '../adapters/toast';
import { WebAdapter } from '../adapters/web';
import { ElectronAdapter } from '../adapters/electron';
import type { NotificationAdapter, NotificationPayload } from '../types';

class MockNativeAdapter implements NotificationAdapter {
  readonly name = 'mock-native';
  showSpy = vi.fn();
  canHandleSpy = vi.fn().mockReturnValue(true);
  requestPermissionSpy = vi.fn().mockResolvedValue(true);

  canHandle(): boolean {
    return this.canHandleSpy();
  }

  show(payload: NotificationPayload): void {
    this.showSpy(payload);
  }

  requestPermission(): Promise<boolean> {
    return this.requestPermissionSpy();
  }
}

describe('Notification Integration', () => {
  let manager: NotificationManager;

  beforeEach(() => {
    NotificationManager.resetForTesting();
    manager = NotificationManager.getInstance();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Environment auto-detection routing', () => {
    it('should route to Electron adapter when electronAPI is available', () => {
      vi.stubGlobal('window', {
        electronAPI: {
          notification: {
            showNativeNotification: vi.fn(),
            setBadgeCount: vi.fn(),
            clearBadgeCount: vi.fn(),
            onNotificationClick: vi.fn(),
          },
        },
      });

      const electronAdapter = new ElectronAdapter();
      const toastAdapter = new ToastAdapter();
      manager.registerAdapter(electronAdapter);
      manager.registerAdapter(toastAdapter);

      expect(electronAdapter.canHandle()).toBe(true);
      expect(toastAdapter.canHandle()).toBe(true);
    });

    it('should route to Web adapter when Notification API exists but no electronAPI', () => {
      vi.stubGlobal('window', {});
      vi.stubGlobal('Notification', vi.fn());

      const webAdapter = new WebAdapter();
      const toastAdapter = new ToastAdapter();
      manager.registerAdapter(webAdapter);
      manager.registerAdapter(toastAdapter);

      expect(webAdapter.canHandle()).toBe(true);
      expect(toastAdapter.canHandle()).toBe(true);
    });

    it('should fall back to Toast adapter when no native APIs are available', () => {
      vi.stubGlobal('window', {});

      const webAdapter = new WebAdapter();
      const toastAdapter = new ToastAdapter();
      manager.registerAdapter(webAdapter);
      manager.registerAdapter(toastAdapter);

      expect(webAdapter.canHandle()).toBe(false);
      expect(toastAdapter.canHandle()).toBe(true);
    });
  });

  describe('End-to-end notification flow', () => {
    it('should route persistent notification to native adapter then toast', () => {
      const nativeAdapter = new MockNativeAdapter();
      const toastAdapter = new ToastAdapter();
      manager.registerAdapter(nativeAdapter);
      manager.registerAdapter(toastAdapter);

      const payload: NotificationPayload = {
        title: 'Price Alert',
        message: 'AAPL reached $200',
        category: 'persistent',
        type: 'price_alert',
        priority: 'high',
      };

      manager.notify(payload);

      expect(nativeAdapter.showSpy).toHaveBeenCalledWith(payload);
    });

    it('should route transient notification to toast adapter only', () => {
      const nativeAdapter = new MockNativeAdapter();
      const toastAdapter = new ToastAdapter();
      manager.registerAdapter(nativeAdapter);
      manager.registerAdapter(toastAdapter);

      const payload: NotificationPayload = {
        title: 'Quick update',
        message: 'Data refreshed',
        category: 'transient',
      };

      manager.notify(payload);

      expect(nativeAdapter.showSpy).not.toHaveBeenCalled();
    });

    it('should skip native and route to toast only when settings disable OS notifications', () => {
      const nativeAdapter = new MockNativeAdapter();
      const toastAdapter = new ToastAdapter();
      manager.registerAdapter(nativeAdapter);
      manager.registerAdapter(toastAdapter);

      // Simulating OS notifications disabled by user settings
      nativeAdapter.canHandleSpy.mockReturnValue(false);

      const payload: NotificationPayload = {
        title: 'Report Complete',
        message: 'Your report is ready',
        category: 'persistent',
        type: 'report_completed',
        priority: 'high',
      };

      manager.notify(payload);

      expect(nativeAdapter.showSpy).not.toHaveBeenCalled();
    });

    it('should use toast variant for UI feedback messages', () => {
      const toastAdapter = new ToastAdapter();
      const nativeAdapter = new MockNativeAdapter();
      manager.registerAdapter(nativeAdapter);
      manager.registerAdapter(toastAdapter);

      manager.toast({ title: 'Saved successfully', variant: 'success' });

      expect(nativeAdapter.showSpy).not.toHaveBeenCalled();
    });
  });

  describe('Adapter fallback chain', () => {
    it('should try next native adapter when first one fails', () => {
      const firstAdapter = new MockNativeAdapter();
      const secondAdapter = new MockNativeAdapter();
      secondAdapter.name = 'mock-native-2';
      const toastAdapter = new ToastAdapter();

      firstAdapter.showSpy.mockImplementation(() => {
        throw new Error('First adapter failed');
      });

      manager.registerAdapter(firstAdapter);
      manager.registerAdapter(secondAdapter);
      manager.registerAdapter(toastAdapter);

      const payload: NotificationPayload = {
        title: 'Test',
        message: 'Test message',
        category: 'persistent',
      };

      manager.notify(payload);

      expect(secondAdapter.showSpy).toHaveBeenCalledWith(payload);
    });
  });
});
