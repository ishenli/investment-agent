import authService from '@server/service/authService';
import settingService from '@server/service/settingService';

export interface FeishuRuntimeConfig {
  enabled: boolean;
  appId: string;
  appSecret: string;
  domain: FeishuDomain;
  allowedUserOpenIds: string[];
  allowedChatIds: string[];
}

export type FeishuDomain = 'feishu' | 'lark';

export class FeishuConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeishuConfigError';
  }
}

export function parseFeishuList(raw: string | undefined): string[] {
  return raw
    ? [
        ...new Set(
          raw
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      ]
    : [];
}

export function parseFeishuDomain(raw: string | undefined): FeishuDomain {
  return raw === 'lark' ? 'lark' : 'feishu';
}

async function getStoredSecret(): Promise<string | undefined> {
  const userId = await authService.getCurrentUserId();
  if (!userId) return undefined;
  const setting = await settingService.getSettingByKey(userId, 'FEISHU_APP_SECRET');
  return setting?.value;
}

export async function hasFeishuAppSecret(): Promise<boolean> {
  if (process.env.FEISHU_APP_SECRET) return true;
  return Boolean(await getStoredSecret());
}

export async function getFeishuRuntimeConfig(): Promise<FeishuRuntimeConfig> {
  const [enabled, appId, domain, allowedUsers, allowedChats, storedSecret] = await Promise.all([
    settingService.getConfigValueByKey('FEISHU_ENABLED'),
    settingService.getConfigValueByKey('FEISHU_APP_ID'),
    settingService.getConfigValueByKey('FEISHU_DOMAIN'),
    settingService.getConfigValueByKey('FEISHU_ALLOWED_USERS'),
    settingService.getConfigValueByKey('FEISHU_ALLOWED_CHATS'),
    getStoredSecret(),
  ]);

  const appSecret = process.env.FEISHU_APP_SECRET || storedSecret || '';

  return {
    enabled: (enabled ?? process.env.FEISHU_ENABLED) === 'true',
    appId: appId ?? process.env.FEISHU_APP_ID ?? '',
    appSecret,
    domain: parseFeishuDomain(domain ?? process.env.FEISHU_DOMAIN),
    allowedUserOpenIds: parseFeishuList(allowedUsers ?? process.env.FEISHU_ALLOWED_USERS),
    allowedChatIds: parseFeishuList(allowedChats ?? process.env.FEISHU_ALLOWED_CHATS),
  };
}
