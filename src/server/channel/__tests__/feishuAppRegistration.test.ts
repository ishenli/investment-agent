import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSettingByKey: vi.fn(),
  setSetting: vi.fn(),
  restart: vi.fn(),
}));

vi.mock('@server/service/settingService', () => ({
  default: {
    getSettingByKey: mocks.getSettingByKey,
    setSetting: mocks.setSetting,
  },
}));

vi.mock('../feishuChannelTask', () => ({ restartFeishuChannel: mocks.restart }));

import {
  clearFeishuRegistrationSessionsForTest,
  FeishuRegistrationSessionError,
  pollFeishuAppRegistration,
  startFeishuAppRegistration,
} from '../feishuAppRegistration';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function beginResponse() {
  return json({
    device_code: 'device-secret',
    verification_uri_complete: 'https://open.feishu.cn/page/cli?user_code=test',
    expires_in: 300,
    interval: 1,
  });
}

describe('Feishu App Registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearFeishuRegistrationSessionsForTest();
    mocks.getSettingByKey.mockResolvedValue({ value: 'ou_existing' });
    mocks.setSetting.mockResolvedValue({});
    mocks.restart.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearFeishuRegistrationSessionsForTest();
  });

  it('verifies, stores, allowlists the authorizer, and never returns secrets', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(beginResponse())
      .mockResolvedValueOnce(
        json({
          client_id: 'cli_created',
          client_secret: 'returned-secret',
          user_info: { open_id: 'ou_authorizer', tenant_brand: 'feishu' },
        }),
      )
      .mockResolvedValueOnce(json({ tenant_access_token: 'tenant-token' }))
      .mockResolvedValueOnce(json({ bot: { open_id: 'ou_bot', app_name: 'Investment Bot' } }));
    vi.stubGlobal('fetch', fetchMock);

    const started = await startFeishuAppRegistration('42');
    const result = await pollFeishuAppRegistration(started.sessionId, '42');

    expect(result).toMatchObject({
      status: 'completed',
      appId: 'cli_created',
      botName: 'Investment Bot',
      pairedOpenId: 'ou_authorizer',
    });
    expect(JSON.stringify(result)).not.toContain('returned-secret');
    expect(JSON.stringify(result)).not.toContain('device-secret');
    expect(mocks.setSetting).toHaveBeenCalledWith('42', 'FEISHU_APP_SECRET', 'returned-secret');
    expect(mocks.setSetting).toHaveBeenCalledWith(
      '42',
      'FEISHU_ALLOWED_USERS',
      'ou_existing,ou_authorizer',
    );
    expect(mocks.restart).toHaveBeenCalledOnce();
  });

  it('persists credentials and flags restartError when the channel restart fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(beginResponse())
      .mockResolvedValueOnce(
        json({
          client_id: 'cli_created',
          client_secret: 'returned-secret',
          user_info: { open_id: 'ou_authorizer', tenant_brand: 'feishu' },
        }),
      )
      .mockResolvedValueOnce(json({ tenant_access_token: 'tenant-token' }))
      .mockResolvedValueOnce(json({ bot: { open_id: 'ou_bot', app_name: 'Investment Bot' } }));
    vi.stubGlobal('fetch', fetchMock);
    mocks.restart.mockRejectedValue(new Error('ws unavailable'));

    const started = await startFeishuAppRegistration('42');
    const result = await pollFeishuAppRegistration(started.sessionId, '42');

    expect(result).toMatchObject({
      status: 'completed',
      appId: 'cli_created',
      restartError: true,
    });
    expect(mocks.setSetting).toHaveBeenCalledWith('42', 'FEISHU_APP_SECRET', 'returned-secret');
    expect(mocks.restart).toHaveBeenCalledOnce();
  });

  it('does not expose a session to another application user', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(beginResponse()));
    const started = await startFeishuAppRegistration('42');

    await expect(pollFeishuAppRegistration(started.sessionId, '7')).rejects.toBeInstanceOf(
      FeishuRegistrationSessionError,
    );
  });

  it('allows only one upstream poll per registration session at a time', async () => {
    let resolvePoll: (response: Response) => void = () => undefined;
    const pendingPoll = new Promise<Response>((resolve) => {
      resolvePoll = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(beginResponse())
      .mockReturnValueOnce(pendingPoll);
    vi.stubGlobal('fetch', fetchMock);

    const started = await startFeishuAppRegistration('42');
    const firstPoll = pollFeishuAppRegistration(started.sessionId, '42');
    await expect(pollFeishuAppRegistration(started.sessionId, '42')).resolves.toMatchObject({
      status: 'waiting',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    resolvePoll(json({ error: 'authorization_pending' }, 400));
    await firstPoll;
  });

  it('switches registration and verification to Lark for a Lark tenant', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(beginResponse())
      .mockResolvedValueOnce(
        json({ user_info: { open_id: 'ou_authorizer', tenant_brand: 'lark' } }, 400),
      )
      .mockResolvedValueOnce(
        json({
          client_id: 'cli_lark',
          client_secret: 'lark-secret',
        }),
      )
      .mockResolvedValueOnce(json({ tenant_access_token: 'tenant-token' }))
      .mockResolvedValueOnce(json({ bot: { open_id: 'ou_bot' } }));
    vi.stubGlobal('fetch', fetchMock);

    const started = await startFeishuAppRegistration('42');
    expect(await pollFeishuAppRegistration(started.sessionId, '42')).toMatchObject({
      status: 'waiting',
      domain: 'lark',
    });
    expect(await pollFeishuAppRegistration(started.sessionId, '42')).toMatchObject({
      status: 'completed',
      domain: 'lark',
    });
    expect(fetchMock.mock.calls[2]?.[0]).toContain('accounts.larksuite.com');
    expect(fetchMock.mock.calls[3]?.[0]).toContain('open.larksuite.com');
  });
});
