import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getDefaultUserId: vi.fn(),
  start: vi.fn(),
  poll: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock('@server/service/authService', () => ({
  default: { getDefaultUserId: mocks.getDefaultUserId },
}));

vi.mock('@server/base/logger', () => ({
  default: { error: vi.fn() },
}));

vi.mock('@server/channel/feishuConfig', () => ({
  FeishuConfigError: class extends Error {},
}));

vi.mock('@server/channel/feishuAppRegistration', () => ({
  FeishuRegistrationSessionError: class extends Error {},
  startFeishuAppRegistration: mocks.start,
  pollFeishuAppRegistration: mocks.poll,
  cancelFeishuAppRegistration: mocks.cancel,
}));

import { POST } from '../route';

function request(body: unknown) {
  return new Request('http://localhost/api/channel/feishu/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Feishu registration API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDefaultUserId.mockResolvedValue('42');
  });

  it('requires a default application user', async () => {
    mocks.getDefaultUserId.mockResolvedValue('');
    const response = await POST(request({ action: 'start' }));

    expect(response.status).toBe(503);
    expect(mocks.start).not.toHaveBeenCalled();
  });

  it('returns only public registration start fields', async () => {
    mocks.start.mockResolvedValue({
      sessionId: '73e1ff20-6797-4f1e-af9a-99b57cfe8901',
      verificationUrl: 'https://open.feishu.cn/page/cli?user_code=test',
      expiresAt: 123,
      intervalMs: 5000,
    });
    const response = await POST(request({ action: 'start' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.start).toHaveBeenCalledWith('42');
    expect(JSON.stringify(body)).not.toContain('device_code');
    expect(JSON.stringify(body)).not.toContain('client_secret');
  });

  it('passes the default application user as the session owner', async () => {
    mocks.poll.mockResolvedValue({ status: 'waiting', intervalMs: 5000 });
    const sessionId = '73e1ff20-6797-4f1e-af9a-99b57cfe8901';
    const response = await POST(request({ action: 'poll', sessionId }));

    expect(response.status).toBe(200);
    expect(mocks.poll).toHaveBeenCalledWith(sessionId, '42');
  });
});
