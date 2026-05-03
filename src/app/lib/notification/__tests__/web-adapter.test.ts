import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebAdapter } from '../adapters/web';
import type { NotificationPayload } from '../types';

describe('WebAdapter', () => {
  let adapter: WebAdapter;
  let originalNotification: any;

  beforeEach(() => {
    adapter = new WebAdapter();
    originalNotification = (globalThis as any).Notification;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    (globalThis as any).Notification = originalNotification;
  });

  describe('canHandle', () => {
    it('当 Notification API 存在时返回 true', () => {
      (globalThis as any).Notification = vi.fn();
      expect(adapter.canHandle()).toBe(true);
    });

    it('当 Notification API 不存在时返回 false', () => {
      delete (globalThis as any).Notification;
      expect(adapter.canHandle()).toBe(false);
    });
  });

  describe('getPermissionState', () => {
    it('应该返回 granted', () => {
      (globalThis as any).Notification = { permission: 'granted' };
      expect(adapter.getPermissionState()).toBe('granted');
    });

    it('当 API 不存在时返回 unsupported', () => {
      delete (globalThis as any).Notification;
      expect(adapter.getPermissionState()).toBe('unsupported');
    });
  });

  describe('requestPermission', () => {
    it('当已授权时返回 true', async () => {
      (globalThis as any).Notification = { permission: 'granted' };
      const result = await adapter.requestPermission();
      expect(result).toBe(true);
    });

    it('当已拒绝时返回 false', async () => {
      (globalThis as any).Notification = { permission: 'denied' };
      const result = await adapter.requestPermission();
      expect(result).toBe(false);
    });

    it('当默认时应请求权限', async () => {
      (globalThis as any).Notification = {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      };
      const result = await adapter.requestPermission();
      expect(result).toBe(true);
    });

    it('当 API 不存在时返回 false', async () => {
      delete (globalThis as any).Notification;
      const result = await adapter.requestPermission();
      expect(result).toBe(false);
    });
  });

  describe('show', () => {
    it('当权限为 granted 时应显示通知', () => {
      const mockNotification = vi.fn();
      const mockClose = vi.fn();
      mockNotification.mockImplementation(() => ({
        close: mockClose,
        onclick: null,
      }));

      (globalThis as any).Notification = mockNotification;
      (globalThis as any).Notification.permission = 'granted';

      const payload: NotificationPayload = {
        title: 'Test',
        message: 'Hello',
        category: 'persistent',
        priority: 'high',
      };

      adapter.show(payload);

      expect(mockNotification).toHaveBeenCalledWith(
        'Test',
        expect.objectContaining({
          body: 'Hello',
          requireInteraction: false,
        }),
      );
    });

    it('当权限未授予时不应显示', () => {
      const mockNotification = vi.fn();
      (globalThis as any).Notification = mockNotification;
      (globalThis as any).Notification.permission = 'denied';

      const payload: NotificationPayload = {
        title: 'Test',
        message: 'Hello',
        category: 'persistent',
      };

      adapter.show(payload);

      expect(mockNotification).not.toHaveBeenCalled();
    });

    it('urgent 通知应设置 requireInteraction', () => {
      const mockNotification = vi.fn();
      mockNotification.mockImplementation(() => ({
        close: vi.fn(),
        onclick: null,
      }));

      (globalThis as any).Notification = mockNotification;
      (globalThis as any).Notification.permission = 'granted';

      const payload: NotificationPayload = {
        title: 'Urgent',
        message: 'Critical',
        category: 'persistent',
        priority: 'urgent',
      };

      adapter.show(payload);

      expect(mockNotification).toHaveBeenCalledWith(
        'Urgent',
        expect.objectContaining({
          requireInteraction: true,
        }),
      );
    });
  });
});
