// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import NotificationSettings from '../page';

const mockGet = vi.fn();
const mockPut = vi.fn();

vi.mock('@/app/lib/request', () => ({
  get: (...args: any[]) => mockGet(...args),
  put: (...args: any[]) => mockPut(...args),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

describe('NotificationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该渲染通知设置页面', async () => {
    mockGet.mockResolvedValue({
      osNotificationsEnabled: true,
      soundEnabled: false,
      types: {},
    });

    render(<NotificationSettings />);

    await waitFor(() => {
      expect(screen.getByText('通知设置')).toBeDefined();
    });
    expect(screen.getByText('管理通知偏好和推送设置')).toBeDefined();
  });

  it('应该显示从服务器加载的偏好设置', async () => {
    mockGet.mockResolvedValue({
      osNotificationsEnabled: false,
      soundEnabled: true,
      types: { price_alert: true },
    });

    render(<NotificationSettings />);

    await waitFor(() => {
      expect(screen.getByText('系统通知')).toBeDefined();
    });
  });

  it('点击保存应该调用 put API', async () => {
    mockGet.mockResolvedValue({
      osNotificationsEnabled: true,
      soundEnabled: false,
      types: {},
    });
    mockPut.mockResolvedValue({ success: true });

    render(<NotificationSettings />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /保存设置/ })).toBeDefined();
    });

    const saveButton = screen.getByRole('button', { name: /保存设置/ });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith('/api/settings/notification', expect.any(Object));
    });
  });

  it('加载失败时应该调用 API', async () => {
    mockGet.mockRejectedValue(new Error('Server error'));

    render(<NotificationSettings />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled();
    });
  });
});
