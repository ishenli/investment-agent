// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useNotifications } from '../useNotifications';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/app/lib/request', () => ({
  get: vi.fn(),
  request: vi.fn(),
}));

vi.mock('@/app/lib/notification/init', () => ({
  initializeNotifications: vi.fn(),
  resetNotificationInit: vi.fn(),
}));

import { get, request } from '@/app/lib/request';
import { notificationManager } from '@/app/lib/notification/manager';

describe('useNotifications', () => {
  let mockedGet: ReturnType<typeof vi.fn>;
  let mockedRequest: ReturnType<typeof vi.fn>;
  let notifySpy: ReturnType<typeof vi.spyOn>;
  let toastSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockedGet = vi.mocked(get);
    mockedRequest = vi.mocked(request);
    notifySpy = vi.spyOn(notificationManager, 'notify').mockImplementation(() => {});
    toastSpy = vi.spyOn(notificationManager, 'toast').mockImplementation(() => {});
    mockPush.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const createNotification = (overrides: Partial<any> = {}) => ({
    id: 1,
    userId: 1,
    type: 'price_alert',
    title: 'Price Alert',
    message: 'AAPL reached $200',
    isRead: false,
    priority: 'high',
    link: '/stock/AAPL',
    createdAt: new Date(),
    ...overrides,
  });

  const createResponse = (items: any[], unreadCount = items.length) => ({
    success: true,
    data: {
      items,
      totalCount: items.length,
      unreadCount,
      totalPages: 1,
      currentPage: 1,
    },
    message: 'ok',
    code: 'SUCCESS',
  });

  it('应该在挂载时初始化轮询', async () => {
    mockedGet.mockResolvedValue(createResponse([]));

    renderHook(() => useNotifications());

    await waitFor(() => {
      expect(mockedGet).toHaveBeenCalledWith('/api/notifications', {
        params: { isRead: 'unread', pageSize: 50 },
      });
    });
  });

  it('新的 high priority price_alert 应该触发 OS + toast', async () => {
    const item = createNotification({ id: 1, type: 'price_alert', priority: 'high' });
    mockedGet.mockResolvedValue(createResponse([item]));

    renderHook(() => useNotifications());

    await waitFor(() => {
      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          title: 'Price Alert',
          message: 'AAPL reached $200',
          category: 'persistent',
          link: '/stock/AAPL',
        })
      );
    });
  });

  it('data_refreshed 低优先级应该只触发 toast', async () => {
    const item = createNotification({
      id: 2,
      type: 'data_refreshed',
      priority: 'low',
      title: 'Data Refreshed',
      message: 'Market data updated',
    });
    mockedGet.mockResolvedValue(createResponse([item]));

    renderHook(() => useNotifications());

    await waitFor(() => {
      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 2,
          category: 'transient',
        })
      );
    });
  });

  it('system_announcement high priority应该触发 OS 通知', async () => {
    const item = createNotification({
      id: 3,
      type: 'system_announcement',
      priority: 'high',
      title: 'System Update',
      message: 'New feature released',
    });
    mockedGet.mockResolvedValue(createResponse([item]));

    renderHook(() => useNotifications());

    await waitFor(() => {
      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 3,
          category: 'persistent',
        })
      );
    });
  });

  it('重复通知不应该重复触发', async () => {
    const item = createNotification({ id: 4, type: 'trade_executed', priority: 'high' });
    mockedGet.mockResolvedValue(createResponse([item]));

    renderHook(() => useNotifications());

    await waitFor(() => expect(notifySpy).toHaveBeenCalledTimes(1));

    // 第二次轮询返回相同 ID
    mockedGet.mockResolvedValue(createResponse([item]));
    await vi.advanceTimersByTimeAsync(16000);

    expect(notifySpy).toHaveBeenCalledTimes(1);
  });

  it('轮询间隔应该约为 15 秒', async () => {
    mockedGet.mockResolvedValue(createResponse([]));

    renderHook(() => useNotifications());

    expect(mockedGet).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60000);
    expect(mockedGet).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(60000);
    expect(mockedGet).toHaveBeenCalledTimes(3);
  });

  it('服务器错误时不应崩溃', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockedGet.mockRejectedValue(new Error('Server down'));

    renderHook(() => useNotifications());

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        '[useNotifications] Poll failed:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('markAsRead 应该调用 PATCH 并刷新', async () => {
    mockedGet.mockResolvedValue(createResponse([]));
    mockedRequest.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => expect(mockedGet).toHaveBeenCalled());

    mockedGet.mockClear();
    mockedGet.mockResolvedValue(createResponse([]));

    await result.current.markAsRead(5);

    expect(mockedRequest).toHaveBeenCalledWith('/api/notifications/5/read', {
      method: 'PATCH',
    });
    expect(mockedGet).toHaveBeenCalled();
  });

  it('notifyTransient 应该直接路由到 toast', () => {
    mockedGet.mockResolvedValue(createResponse([]));

    const { result } = renderHook(() => useNotifications());

    result.current.notifyTransient({
      title: 'Local Alert',
      message: 'Portfolio reminder',
    });

    expect(toastSpy).toHaveBeenCalledWith({
      title: 'Local Alert',
      message: 'Portfolio reminder',
    });
  });

  it('refresh 应该强制重新轮询', async () => {
    mockedGet.mockResolvedValue(createResponse([]));

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(1));

    mockedGet.mockClear();
    await result.current.refresh();

    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it('unreadCount 应该从响应中更新', async () => {
    const items = [
      createNotification({ id: 10 }),
      createNotification({ id: 11 }),
    ];
    mockedGet.mockResolvedValue(createResponse(items, 2));

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(2);
      expect(result.current.notifications).toHaveLength(2);
    });
  });
});
