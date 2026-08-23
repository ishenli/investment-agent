import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getDefaultUserId: vi.fn(),
  getConfigValueByKey: vi.fn(),
  setSetting: vi.fn(),
  hasSecret: vi.fn(() => Promise.resolve(true)),
  restart: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}));

vi.mock('@server/service/authService', () => ({
  default: { getDefaultUserId: mocks.getDefaultUserId },
}));

vi.mock('@server/service/settingService', () => ({
  default: {
    getConfigValueByKey: mocks.getConfigValueByKey,
    setSetting: mocks.setSetting,
  },
}));

vi.mock('@server/channel/feishuConfig', async (importOriginal) => {
  const original = await importOriginal<typeof import('@server/channel/feishuConfig')>();
  return {
    ...original,
    hasFeishuAppSecret: mocks.hasSecret,
  };
});

vi.mock('@server/channel/feishuChannelTask', () => ({
  getFeishuChannelStatus: () => ({ running: false, connectionState: 'disconnected' }),
  restartFeishuChannel: mocks.restart,
  startFeishuChannel: mocks.start,
  stopFeishuChannel: mocks.stop,
}));

import { GET, POST, PUT } from '../route';

function request(method: string, body?: unknown) {
  return new Request('http://localhost/api/channel/feishu', {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe('Feishu configuration API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDefaultUserId.mockResolvedValue('42');
    mocks.getConfigValueByKey.mockImplementation(
      async (key: string) =>
        ({
          FEISHU_ENABLED: 'true',
          FEISHU_APP_ID: 'cli_test',
          FEISHU_DOMAIN: 'feishu',
          FEISHU_ALLOWED_USERS: 'ou_allowed',
          FEISHU_ALLOWED_CHATS: 'oc_allowed',
        })[key],
    );
  });

  it('returns public configuration without the App Secret', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(JSON.stringify(body)).not.toContain('appSecret');
    expect(body.data.secretConfigured).toBe(true);
  });

  it('stores a replacement secret locally by user id', async () => {
    const response = await PUT(
      request('PUT', {
        enabled: true,
        appId: 'cli_test',
        appSecret: 'new-secret',
        domain: 'feishu',
        allowedUserOpenIds: ['ou_allowed'],
        allowedChatIds: [],
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.setSetting).toHaveBeenCalledWith('42', 'FEISHU_APP_SECRET', 'new-secret');
    expect(mocks.restart).toHaveBeenCalledOnce();
  });

  it('requires a default application user before lifecycle actions', async () => {
    mocks.getDefaultUserId.mockResolvedValue('');

    const response = await POST(request('POST', { action: 'start' }));

    expect(response.status).toBe(400);
    expect(mocks.start).not.toHaveBeenCalled();
  });
});
