import authService from '@server/service/authService';
import settingService from '@server/service/settingService';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getFeishuRuntimeConfig, parseFeishuList } from '../feishuConfig';

describe('Feishu secret configuration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('loads a locally stored App Secret', async () => {
    vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('42');
    vi.spyOn(settingService, 'getConfigValueByKey').mockResolvedValue(undefined);
    vi.spyOn(settingService, 'getSettingByKey').mockResolvedValue({ value: 'app-secret' } as never);
    vi.stubEnv('FEISHU_APP_SECRET', '');

    await expect(getFeishuRuntimeConfig()).resolves.toMatchObject({ appSecret: 'app-secret' });
  });

  it('normalizes comma-separated allowlists', () => {
    expect(parseFeishuList(' ou_a,ou_b, ou_a ,,')).toEqual(['ou_a', 'ou_b']);
  });

  it('treats a missing application user as unconfigured', async () => {
    vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('');
    vi.spyOn(settingService, 'getConfigValueByKey').mockResolvedValue(undefined);
    const getSetting = vi.spyOn(settingService, 'getSettingByKey');
    vi.stubEnv('FEISHU_APP_SECRET', '');

    await expect(getFeishuRuntimeConfig()).resolves.toMatchObject({
      enabled: false,
      appSecret: '',
    });
    expect(getSetting).not.toHaveBeenCalled();
  });
});
