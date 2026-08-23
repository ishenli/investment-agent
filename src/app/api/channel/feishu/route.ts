import { z } from 'zod';
import authService from '@server/service/authService';
import logger from '@server/base/logger';
import settingService from '@server/service/settingService';
import {
  FeishuConfigError,
  hasFeishuAppSecret,
  parseFeishuDomain,
  parseFeishuList,
} from '@server/channel/feishuConfig';
import {
  getFeishuChannelStatus,
  restartFeishuChannel,
  startFeishuChannel,
  stopFeishuChannel,
} from '@server/channel/feishuChannelTask';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const IdSchema = z.string().trim().max(128);
const SaveConfigSchema = z
  .object({
    enabled: z.boolean(),
    appId: z.string().trim().max(128),
    appSecret: z.string().max(512).optional(),
    domain: z.enum(['feishu', 'lark']).default('feishu'),
    allowedUserOpenIds: z.array(IdSchema.regex(/^ou_/, 'Private users must use open_id')).max(100),
    allowedChatIds: z.array(IdSchema.regex(/^oc_/, 'Groups must use chat_id')).max(100),
  })
  .refine(
    (config) =>
      !config.enabled || config.allowedUserOpenIds.length > 0 || config.allowedChatIds.length > 0,
    { message: 'At least one private user or group must be allowlisted' },
  );

const ActionSchema = z.object({
  action: z.enum(['start', 'stop', 'restart']),
});

async function getApplicationUserId() {
  // @CfSecAICode 遵循消费金融安全编码 BE-AUTH-001 规范: 单用户渠道配置仅使用服务端默认用户，不接受请求中的身份字段。
  const userId = await authService.getDefaultUserId();
  if (!userId) throw new FeishuConfigError('Feishu requires a default application user');
  return userId;
}

async function readPublicConfig() {
  const [enabled, appId, domain, allowedUsers, allowedChats, secretConfigured] = await Promise.all([
    settingService.getConfigValueByKey('FEISHU_ENABLED'),
    settingService.getConfigValueByKey('FEISHU_APP_ID'),
    settingService.getConfigValueByKey('FEISHU_DOMAIN'),
    settingService.getConfigValueByKey('FEISHU_ALLOWED_USERS'),
    settingService.getConfigValueByKey('FEISHU_ALLOWED_CHATS'),
    hasFeishuAppSecret(),
  ]);

  return {
    enabled: enabled === 'true',
    appId: appId ?? '',
    domain: parseFeishuDomain(domain),
    allowedUserOpenIds: parseFeishuList(allowedUsers),
    allowedChatIds: parseFeishuList(allowedChats),
    secretConfigured,
    ...getFeishuChannelStatus(),
  };
}

export async function GET() {
  try {
    return Response.json({ success: true, data: await readPublicConfig() });
  } catch (error) {
    const status = error instanceof FeishuConfigError ? 400 : 500;
    return Response.json(
      { success: false, error: 'Unable to read Feishu configuration' },
      { status },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getApplicationUserId();
    const config = SaveConfigSchema.parse(await request.json());
    const secret = config.appSecret?.trim();

    await Promise.all([
      settingService.setSetting(userId, 'FEISHU_ENABLED', String(config.enabled)),
      settingService.setSetting(userId, 'FEISHU_APP_ID', config.appId),
      settingService.setSetting(userId, 'FEISHU_DOMAIN', config.domain),
      settingService.setSetting(
        userId,
        'FEISHU_ALLOWED_USERS',
        config.allowedUserOpenIds.join(','),
      ),
      settingService.setSetting(userId, 'FEISHU_ALLOWED_CHATS', config.allowedChatIds.join(',')),
      // @CfSecAICode 遵循消费金融安全编码 BE-SECRET-001 规范: Secret 仅写入本地设置，不进入响应或日志。
      ...(secret
        ? [settingService.setSetting(userId, 'FEISHU_APP_SECRET', secret)]
        : []),
    ]);

    await restartFeishuChannel();
    return Response.json({ success: true, data: await readPublicConfig() });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof FeishuConfigError) {
      return Response.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }
    logger.error('[FeishuConfigAPI] Failed to save configuration', error);
    return Response.json(
      { success: false, error: 'Unable to save Feishu configuration' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await getApplicationUserId();
    const { action } = ActionSchema.parse(await request.json());
    if (action === 'stop') await stopFeishuChannel();
    else if (action === 'restart') await restartFeishuChannel();
    else await startFeishuChannel();
    return Response.json({ success: true, data: await readPublicConfig() });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof FeishuConfigError) {
      return Response.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }
    logger.error('[FeishuConfigAPI] Channel action failed', error);
    return Response.json(
      { success: false, error: 'Feishu channel action failed' },
      { status: 500 },
    );
  }
}
