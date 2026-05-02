import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ElectronAdapter } from '../adapters/electron';
import type { NotificationPayload } from '../types';

describe('ElectronAdapter', () => {
  let adapter: ElectronAdapter;

  beforeEach(() => {
    vi.stubGlobal('window', {});
    adapter = new ElectronAdapter();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('canHandle', () => {
    it('当 electronAPI.notification 存在时返回 true', () => {
      (window as any).electronAPI = {
        notification: {
          showNativeNotification: vi.fn(),
          setBadgeCount: vi.fn(),
        },
      };

      expect(adapter.canHandle()).toBe(true);
    });

    it('当 electronAPI 不存在时返回 false', () => {
      expect(adapter.canHandle()).toBe(false);
    });

    it('当 electronAPI.notification 不存在时返回 false', () => {
      (window as any).electronAPI = { updater: {} };
      expect(adapter.canHandle()).toBe(false);
    });
  });

  describe('show', () => {
    it('应该调用 showNativeNotification', () => {
      const mockShow = vi.fn().mockResolvedValue(undefined);
      (window as any).electronAPI = {
        notification: {
          showNativeNotification: mockShow,
          setBadgeCount: vi.fn(),
          clearBadgeCount: vi.fn(),
          onNotificationClick: vi.fn(),
        },
      };

      const payload: NotificationPayload = {
        title: 'Test Title',
        message: 'Test Body',
        category: 'persistent',
        link: '/dashboard',
        actions: [{ id: 'view', label: 'View' }],
      };

      adapter.show(payload);

      expect(mockShow).toHaveBeenCalledWith({
        title: 'Test Title',
        body: 'Test Body',
        link: '/dashboard',
        actions: [{ id: 'view', label: 'View' }],
      });
    });

    it('当 electronAPI 不存在时不应崩溃', () => {
      const payload: NotificationPayload = {
        title: 'Test',
        message: 'Hello',
        category: 'persistent',
      };

      expect(() => adapter.show(payload)).not.toThrow();
    });
  });

  describe('setBadgeCount', () => {
    it('应该调用 setBadgeCount', async () => {
      const mockSetBadge = vi.fn().mockResolvedValue(undefined);
      (window as any).electronAPI = {
        notification: {
          showNativeNotification: vi.fn(),
          setBadgeCount: mockSetBadge,
          clearBadgeCount: vi.fn(),
          onNotificationClick: vi.fn(),
        },
      };

      await adapter.setBadgeCount(5);

      expect(mockSetBadge).toHaveBeenCalledWith(5);
    });

    it('当 electronAPI 不存在时应静默返回', async () => {
      await expect(adapter.setBadgeCount(5)).resolves.toBeUndefined();
    });
  });

  describe('onNotificationClick', () => {
    it('应该注册回调', () => {
      const mockOnClick = vi.fn();
      (window as any).electronAPI = {
        notification: {
          showNativeNotification: vi.fn(),
          setBadgeCount: vi.fn(),
          clearBadgeCount: vi.fn(),
          onNotificationClick: mockOnClick,
        },
      };

      const callback = vi.fn();
      adapter.onNotificationClick(callback);

      expect(mockOnClick).toHaveBeenCalledWith(callback);
    });
  });
});
