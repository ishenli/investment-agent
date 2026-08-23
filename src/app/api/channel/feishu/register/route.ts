import { z } from 'zod';
import authService from '@server/service/authService';
import logger from '@server/base/logger';
import { FeishuConfigError } from '@server/channel/feishuConfig';
import {
  cancelFeishuAppRegistration,
  FeishuRegistrationSessionError,
  pollFeishuAppRegistration,
  startFeishuAppRegistration,
} from '@server/channel/feishuAppRegistration';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RequestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start') }),
  z.object({ action: z.literal('poll'), sessionId: z.string().uuid() }),
  z.object({ action: z.literal('cancel'), sessionId: z.string().uuid() }),
]);

export async function POST(request: Request) {
  try {
    // @CfSecAICode 遵循消费金融安全编码 BE-AUTH-001 规范: 注册 owner 来自服务端默认用户，不接受请求身份字段。
    const userId = await authService.getDefaultUserId();
    if (!userId) {
      return Response.json(
        { success: false, error: 'Feishu requires a default application user' },
        { status: 503 },
      );
    }

    const input = RequestSchema.parse(await request.json());
    if (input.action === 'start') {
      const registration = await startFeishuAppRegistration(userId);
      return Response.json({ success: true, data: registration });
    }
    if (input.action === 'cancel') {
      cancelFeishuAppRegistration(input.sessionId, userId);
      return Response.json({ success: true });
    }

    const registration = await pollFeishuAppRegistration(input.sessionId, userId);
    return Response.json({ success: true, data: registration });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { success: false, error: 'Invalid registration request' },
        { status: 400 },
      );
    }
    if (error instanceof FeishuRegistrationSessionError) {
      return Response.json({ success: false, error: error.message }, { status: 404 });
    }
    if (error instanceof FeishuConfigError) {
      return Response.json({ success: false, error: error.message }, { status: 400 });
    }
    logger.error('[FeishuRegistrationAPI] Registration request failed', {
      errorType: error instanceof Error ? error.name : typeof error,
    });
    return Response.json(
      { success: false, error: 'Feishu registration is unavailable' },
      { status: 502 },
    );
  }
}
