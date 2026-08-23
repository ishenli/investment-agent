import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import settingService from '@server/service/settingService';
import { parseFeishuList, type FeishuDomain } from './feishuConfig';
import { restartFeishuChannel } from './feishuChannelTask';

const ACCOUNT_ORIGINS: Record<FeishuDomain, string> = {
  feishu: 'https://accounts.feishu.cn',
  lark: 'https://accounts.larksuite.com',
};
const OPEN_API_ORIGINS: Record<FeishuDomain, string> = {
  feishu: 'https://open.feishu.cn',
  lark: 'https://open.larksuite.com',
};
const REGISTRATION_PATH = '/oauth/v1/app/registration';
const MAX_POLL_INTERVAL_MS = 60_000;
const SESSION_RETENTION_MS = 10 * 60_000;

const BeginResponseSchema = z.object({
  device_code: z.string().min(1),
  verification_uri_complete: z.string().url(),
  expires_in: z.number().positive().optional(),
  interval: z.number().positive().optional(),
});

const PollResponseSchema = z.object({
  client_id: z.string().optional(),
  client_secret: z.string().optional(),
  user_info: z
    .object({
      open_id: z.string().optional(),
      tenant_brand: z.string().optional(),
    })
    .optional(),
  error: z.string().optional(),
});

export type FeishuRegistrationStatus = 'waiting' | 'completed' | 'failed' | 'expired';
export type FeishuRegistrationErrorCode =
  | 'access_denied'
  | 'expired'
  | 'invalid_credentials'
  | 'missing_credentials'
  | 'missing_user'
  | 'storage_failed';

interface RegistrationSession {
  ownerUserId: string;
  deviceCode: string;
  verificationUrl: string;
  expiresAt: number;
  intervalMs: number;
  nextPollAt: number;
  domain: FeishuDomain;
  status: FeishuRegistrationStatus;
  polling?: boolean;
  errorCode?: FeishuRegistrationErrorCode;
  appId?: string;
  pendingAppId?: string;
  authorizerOpenId?: string;
  botName?: string;
  pairedOpenId?: string;
  restartError?: boolean;
}

export interface PublicFeishuRegistrationSession {
  status: FeishuRegistrationStatus;
  expiresAt: number;
  intervalMs: number;
  domain: FeishuDomain;
  errorCode?: FeishuRegistrationErrorCode;
  appId?: string;
  botName?: string;
  pairedOpenId?: string;
  restartError?: boolean;
}

export class FeishuRegistrationSessionError extends Error {
  constructor() {
    super('Registration session not found');
    this.name = 'FeishuRegistrationSessionError';
  }
}

const GLOBAL_KEY = '__investment_agent_feishu_registration_sessions__';

function sessions(): Map<string, RegistrationSession> {
  const globalState = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: Map<string, RegistrationSession>;
  };
  globalState[GLOBAL_KEY] ??= new Map<string, RegistrationSession>();
  return globalState[GLOBAL_KEY];
}

function publicSession(session: RegistrationSession): PublicFeishuRegistrationSession {
  return {
    status: session.status,
    expiresAt: session.expiresAt,
    intervalMs: session.intervalMs,
    domain: session.domain,
    errorCode: session.errorCode,
    appId: session.appId,
    botName: session.botName,
    pairedOpenId: session.pairedOpenId,
    restartError: session.restartError,
  };
}

async function postRegistration(origin: string, body: URLSearchParams) {
  const response = await fetch(`${origin}${REGISTRATION_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  const payload: unknown = await response.json();
  return { ok: response.ok, payload };
}

export async function startFeishuAppRegistration(ownerUserId: string): Promise<{
  sessionId: string;
  verificationUrl: string;
  expiresAt: number;
  intervalMs: number;
}> {
  const { ok, payload } = await postRegistration(
    ACCOUNT_ORIGINS.feishu,
    new URLSearchParams({
      action: 'begin',
      archetype: 'PersonalAgent',
      auth_method: 'client_secret',
      request_user_info: 'open_id tenant_brand',
    }),
  );
  if (!ok) throw new Error('Feishu registration is unavailable');

  const data = BeginResponseSchema.parse(payload);
  const now = Date.now();
  const sessionId = randomUUID();
  const session: RegistrationSession = {
    ownerUserId,
    deviceCode: data.device_code,
    verificationUrl: data.verification_uri_complete,
    expiresAt: now + (data.expires_in ?? 300) * 1000,
    intervalMs: (data.interval ?? 5) * 1000,
    nextPollAt: now,
    domain: 'feishu',
    status: 'waiting',
  };
  sessions().set(sessionId, session);

  const cleanup = setTimeout(() => sessions().delete(sessionId), SESSION_RETENTION_MS);
  cleanup.unref?.();

  return {
    sessionId,
    verificationUrl: session.verificationUrl,
    expiresAt: session.expiresAt,
    intervalMs: session.intervalMs,
  };
}

function ownedSession(sessionId: string, ownerUserId: string): RegistrationSession {
  const session = sessions().get(sessionId);
  if (!session || session.ownerUserId !== ownerUserId) throw new FeishuRegistrationSessionError();
  return session;
}

async function verifyBot(appId: string, appSecret: string, domain: FeishuDomain): Promise<string> {
  const origin = OPEN_API_ORIGINS[domain];
  const tokenResponse = await fetch(`${origin}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    signal: AbortSignal.timeout(10_000),
  });
  const tokenPayload = z
    .object({ tenant_access_token: z.string().optional() })
    .passthrough()
    .parse(await tokenResponse.json());
  if (!tokenResponse.ok || !tokenPayload.tenant_access_token) {
    throw new Error('Credential verification failed');
  }

  const botResponse = await fetch(`${origin}/open-apis/bot/v3/info/`, {
    headers: { Authorization: `Bearer ${tokenPayload.tenant_access_token}` },
    signal: AbortSignal.timeout(10_000),
  });
  const botPayload = z
    .object({
      bot: z.object({ app_name: z.string().optional(), open_id: z.string().min(1) }).optional(),
    })
    .passthrough()
    .parse(await botResponse.json());
  if (!botResponse.ok || !botPayload.bot?.open_id) throw new Error('Bot verification failed');
  return botPayload.bot.app_name ?? botPayload.bot.open_id;
}

async function completeRegistration(
  session: RegistrationSession,
  appId: string,
  appSecret: string,
  authorizerOpenId: string,
): Promise<void> {
  let botName: string;
  try {
    botName = await verifyBot(appId, appSecret, session.domain);
  } catch {
    session.status = 'failed';
    session.errorCode = 'invalid_credentials';
    return;
  }

  try {
    const existing = await settingService.getSettingByKey(
      session.ownerUserId,
      'FEISHU_ALLOWED_USERS',
    );
    const allowedUsers = [...new Set([...parseFeishuList(existing?.value), authorizerOpenId])];
    await Promise.all([
      settingService.setSetting(session.ownerUserId, 'FEISHU_ENABLED', 'true'),
      settingService.setSetting(session.ownerUserId, 'FEISHU_APP_ID', appId),
      // @CfSecAICode 遵循消费金融安全编码 BE-SECRET-001 规范: Secret 仅在服务端本地持久化，不进入公开 session。
      settingService.setSetting(session.ownerUserId, 'FEISHU_APP_SECRET', appSecret),
      settingService.setSetting(session.ownerUserId, 'FEISHU_DOMAIN', session.domain),
      settingService.setSetting(
        session.ownerUserId,
        'FEISHU_ALLOWED_USERS',
        allowedUsers.join(','),
      ),
    ]);
  } catch {
    session.status = 'failed';
    session.errorCode = 'storage_failed';
    return;
  }

  try {
    await restartFeishuChannel();
  } catch {
    session.restartError = true;
  }
  session.status = 'completed';
  session.appId = appId;
  session.botName = botName;
  session.pairedOpenId = authorizerOpenId;
}

export async function pollFeishuAppRegistration(
  sessionId: string,
  ownerUserId: string,
): Promise<PublicFeishuRegistrationSession> {
  const session = ownedSession(sessionId, ownerUserId);
  if (session.status !== 'waiting') return publicSession(session);

  const now = Date.now();
  if (now >= session.expiresAt) {
    session.status = 'expired';
    session.errorCode = 'expired';
    return publicSession(session);
  }
  if (now < session.nextPollAt) return publicSession(session);
  if (session.polling) return publicSession(session);

  session.polling = true;
  try {
    const { payload } = await postRegistration(
      ACCOUNT_ORIGINS[session.domain],
      new URLSearchParams({ action: 'poll', device_code: session.deviceCode }),
    );
    const result = PollResponseSchema.parse(payload);
    session.nextPollAt = now + session.intervalMs;

    if (result.error === 'authorization_pending') return publicSession(session);
    if (result.error === 'slow_down') {
      session.intervalMs = Math.min(session.intervalMs + 5000, MAX_POLL_INTERVAL_MS);
      session.nextPollAt = now + session.intervalMs;
      return publicSession(session);
    }
    if (result.error === 'access_denied') {
      session.status = 'failed';
      session.errorCode = 'access_denied';
      return publicSession(session);
    }
    if (result.error === 'expired_token') {
      session.status = 'expired';
      session.errorCode = 'expired';
      return publicSession(session);
    }
    if (result.error) throw new Error('Feishu registration polling failed');

    const tenantDomain: FeishuDomain =
      result.user_info?.tenant_brand === 'lark' ? 'lark' : session.domain;
    session.pendingAppId = result.client_id?.trim() || session.pendingAppId;
    session.authorizerOpenId = result.user_info?.open_id?.trim() || session.authorizerOpenId;
    if (tenantDomain === 'lark' && !result.client_secret && session.domain !== 'lark') {
      session.domain = 'lark';
      session.nextPollAt = now;
      return publicSession(session);
    }
    session.domain = tenantDomain;

    const appId = result.client_id?.trim() || session.pendingAppId;
    const appSecret = result.client_secret?.trim();
    const authorizerOpenId = result.user_info?.open_id?.trim() || session.authorizerOpenId;
    if (!appId || !appSecret) {
      session.status = 'failed';
      session.errorCode = 'missing_credentials';
      return publicSession(session);
    }
    if (!authorizerOpenId?.startsWith('ou_')) {
      session.status = 'failed';
      session.errorCode = 'missing_user';
      return publicSession(session);
    }

    await completeRegistration(session, appId, appSecret, authorizerOpenId);
    return publicSession(session);
  } finally {
    session.polling = false;
  }
}

export function cancelFeishuAppRegistration(sessionId: string, ownerUserId: string): void {
  ownedSession(sessionId, ownerUserId);
  sessions().delete(sessionId);
}

export function clearFeishuRegistrationSessionsForTest(): void {
  sessions().clear();
}
