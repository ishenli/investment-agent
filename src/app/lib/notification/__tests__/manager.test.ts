import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationManager } from '../manager';
import type { NotificationAdapter, NotificationPayload } from '../types';

class MockAdapter implements NotificationAdapter {
  readonly name: string;
  canHandleValue: boolean;
  showSpy = vi.fn();
  requestPermissionSpy = vi.fn().mockResolvedValue(true);

  constructor(name: string, canHandleValue: boolean) {
    this.name = name;
    this.canHandleValue = canHandleValue;
  }

  canHandle(): boolean {
    return this.canHandleValue;
  }

  show(payload: NotificationPayload): void {
    this.showSpy(payload);
  }

  requestPermission(): Promise<boolean> {
    return this.requestPermissionSpy();
  }
}

describe('NotificationManager', () => {
  let manager: NotificationManager;

  beforeEach(() => {
    NotificationManager.resetForTesting();
    manager = NotificationManager.getInstance();
  });

  describe('notify', () => {
    it('应该只显示toast当category为transient', () => {
      const mockNative = new MockAdapter('native', true);
      const mockToast = new MockAdapter('toast', true);
      manager.registerAdapter(mockNative);
      manager.registerAdapter(mockToast);

      const payload: NotificationPayload = {
        title: 'Test',
        message: 'Hello',
        category: 'transient',
      };

      manager.notify(payload);

      expect(mockNative.showSpy).not.toHaveBeenCalled();
      expect(mockToast.showSpy).toHaveBeenCalledWith(payload);
    });

    it('应该路由persistent通知到第一个可用的非toast适配器', () => {
      const mockNative = new MockAdapter('native', true);
      const mockToast = new MockAdapter('toast', true);
      manager.registerAdapter(mockNative);
      manager.registerAdapter(mockToast);

      const payload: NotificationPayload = {
        title: 'Test',
        message: 'Hello',
        category: 'persistent',
      };

      manager.notify(payload);

      expect(mockNative.showSpy).toHaveBeenCalledWith(payload);
      expect(mockToast.showSpy).toHaveBeenCalledWith(payload);
    });

    it('应该跳过不可用的适配器', () => {
      const mockNative = new MockAdapter('native', false);
      const mockWeb = new MockAdapter('web', true);
      const mockToast = new MockAdapter('toast', true);
      manager.registerAdapter(mockNative);
      manager.registerAdapter(mockWeb);
      manager.registerAdapter(mockToast);

      const payload: NotificationPayload = {
        title: 'Test',
        message: 'Hello',
        category: 'persistent',
      };

      manager.notify(payload);

      expect(mockNative.showSpy).not.toHaveBeenCalled();
      expect(mockWeb.showSpy).toHaveBeenCalledWith(payload);
      expect(mockToast.showSpy).toHaveBeenCalledWith(payload);
    });

    it('应该在适配器失败时回退到下一个适配器', () => {
      const mockNative = new MockAdapter('native', true);
      mockNative.showSpy = vi.fn(() => {
        throw new Error('Native failed');
      });
      const mockWeb = new MockAdapter('web', true);
      const mockToast = new MockAdapter('toast', true);
      manager.registerAdapter(mockNative);
      manager.registerAdapter(mockWeb);
      manager.registerAdapter(mockToast);

      const payload: NotificationPayload = {
        title: 'Test',
        message: 'Hello',
        category: 'persistent',
      };

      manager.notify(payload);

      expect(mockNative.showSpy).toHaveBeenCalled();
      expect(mockWeb.showSpy).toHaveBeenCalledWith(payload);
      expect(mockToast.showSpy).toHaveBeenCalledWith(payload);
    });

    it('应该在toast适配器失败时不崩溃', () => {
      const mockToast = new MockAdapter('toast', true);
      mockToast.showSpy = vi.fn(() => {
        throw new Error('Toast failed');
      });
      manager.registerAdapter(mockToast);

      const payload: NotificationPayload = {
        title: 'Test',
        message: 'Hello',
        category: 'transient',
      };

      expect(() => manager.notify(payload)).not.toThrow();
    });
  });

  describe('toast', () => {
    it('应该将toast调用路由为transient通知', () => {
      const mockToast = new MockAdapter('toast', true);
      manager.registerAdapter(mockToast);

      manager.toast({
        title: 'Quick Toast',
        message: 'Something happened',
      });

      expect(mockToast.showSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Quick Toast',
          message: 'Something happened',
          category: 'transient',
        }),
      );
    });
  });

  describe('requestPermission', () => {
    it('应该向第一个可用的非toast适配器请求权限', async () => {
      const mockNative = new MockAdapter('native', true);
      const mockToast = new MockAdapter('toast', true);
      manager.registerAdapter(mockNative);
      manager.registerAdapter(mockToast);

      const result = await manager.requestPermission();

      expect(result).toBe(true);
      expect(mockNative.requestPermissionSpy).toHaveBeenCalled();
      expect(mockToast.requestPermissionSpy).not.toHaveBeenCalled();
    });

    it('应该在所有适配器都拒绝时返回false', async () => {
      const mockNative = new MockAdapter('native', true);
      mockNative.requestPermissionSpy = vi.fn().mockResolvedValue(false);
      manager.registerAdapter(mockNative);

      const result = await manager.requestPermission();

      expect(result).toBe(false);
    });

    it('应该在没有非toast适配器时返回false', async () => {
      const mockToast = new MockAdapter('toast', true);
      manager.registerAdapter(mockToast);

      const result = await manager.requestPermission();

      expect(result).toBe(false);
    });
  });
});
