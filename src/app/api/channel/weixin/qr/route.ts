/**
 * Weixin QR Login — Server-Sent Events endpoint
 *
 * Mirrors the terminal-based `qr_login` flow from gateway/platforms/weixin.py
 * and exposes it as a streaming HTTP endpoint so the web UI can:
 *
 *   1. GET /api/channel/weixin/qr  → SSE stream
 *   2. Show QR image from the received `qrcode_url`
 *   3. Poll status events: wait → scaned → confirmed / expired / error
 *   4. On `confirmed`, account_id + token are saved to the settings DB
 *
 * SSE event shapes:
 *   { type: 'qr',        qrcodeUrl: string, qrcodeValue: string }
 *   { type: 'status',    status: 'wait' | 'scaned' | 'confirmed' | 'expired' | 'error', message?: string }
 *   { type: 'success',   accountId: string, userId: string }
 *   { type: 'error',     message: string }
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import settingService from '@server/service/settingService';
import authService from '@server/service/authService';
import logger from '@server/base/logger';
import weixinChannelTask from '@/server/channel/weixinChannelTask';

const ILINK_BASE_URL = 'https://ilinkai.weixin.qq.com';
const ILINK_APP_ID = 'bot';
const ILINK_APP_CLIENT_VERSION = (2 << 16) | (2 << 8) | 0;
const QR_TIMEOUT_MS = 35_000;
const LOGIN_TIMEOUT_SECONDS = 480;
const MAX_QR_REFRESHES = 3;

function ilinkHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'iLink-App-Id': ILINK_APP_ID,
    'iLink-App-ClientVersion': String(ILINK_APP_CLIENT_VERSION),
  };
}

async function ilinkGet(endpoint: string): Promise<Record<string, unknown>> {
  const url = `${ILINK_BASE_URL}/${endpoint}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QR_TIMEOUT_MS);
  try {
    const resp = await fetch(url, { headers: ilinkHeaders(), signal: controller.signal });
    const text = await resp.text();
    if (!resp.ok) throw new Error(`iLink GET ${endpoint} HTTP ${resp.status}: ${text.slice(0, 200)}`);
    return JSON.parse(text) as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
  }
}

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export async function GET(): Promise<Response> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(sseEvent(payload)));
        } catch {
          // Client disconnected
        }
      };

      const close = () => {
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      try {
        // ── Step 1: Fetch QR code ──
        let qrResp: Record<string, unknown>;
        try {
          qrResp = await ilinkGet(`ilink/bot/get_bot_qrcode?bot_type=3`);
        } catch (err) {
          send({ type: 'error', message: `获取二维码失败: ${err instanceof Error ? err.message : String(err)}` });
          close();
          return;
        }

        let qrcodeValue = String(qrResp['qrcode'] ?? '').trim();
        let qrcodeUrl = String(qrResp['qrcode_img_content'] ?? '').trim();

        if (!qrcodeValue) {
          send({ type: 'error', message: '二维码响应缺少 qrcode 字段' });
          close();
          return;
        }

        // Push QR to client
        send({ type: 'qr', qrcodeUrl, qrcodeValue });

        // ── Step 2: Poll QR status ──
        const deadline = Date.now() + LOGIN_TIMEOUT_SECONDS * 1000;
        let currentBaseUrl = ILINK_BASE_URL;
        let refreshCount = 0;

        while (Date.now() < deadline) {
          await sleep(1000);

          let statusResp: Record<string, unknown>;
          try {
            const pollUrl = `${currentBaseUrl.replace(/\/$/, '')}/ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcodeValue)}`;
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), QR_TIMEOUT_MS);
            try {
              const r = await fetch(pollUrl, { headers: ilinkHeaders(), signal: ctrl.signal });
              const txt = await r.text();
              statusResp = JSON.parse(txt) as Record<string, unknown>;
            } finally {
              clearTimeout(t);
            }
          } catch {
            // Transient error — keep polling
            continue;
          }

          const status = String(statusResp['status'] ?? 'wait');

          if (status === 'wait') {
            send({ type: 'status', status: 'wait' });
          } else if (status === 'scaned') {
            send({ type: 'status', status: 'scaned', message: '已扫码，请在微信中确认' });
          } else if (status === 'scaned_but_redirect') {
            const redirectHost = String(statusResp['redirect_host'] ?? '');
            if (redirectHost) currentBaseUrl = `https://${redirectHost}`;
          } else if (status === 'expired') {
            refreshCount++;
            if (refreshCount > MAX_QR_REFRESHES) {
              send({ type: 'error', message: '二维码多次过期，请重新发起登录' });
              close();
              return;
            }
            send({ type: 'status', status: 'expired', message: `二维码已过期，正在刷新 (${refreshCount}/${MAX_QR_REFRESHES})` });

            // Refresh QR
            try {
              const newQr = await ilinkGet(`ilink/bot/get_bot_qrcode?bot_type=3`);
              qrcodeValue = String(newQr['qrcode'] ?? '').trim();
              qrcodeUrl = String(newQr['qrcode_img_content'] ?? '').trim();
              if (!qrcodeValue) throw new Error('刷新后 qrcode 为空');
              send({ type: 'qr', qrcodeUrl, qrcodeValue });
            } catch (err) {
              send({ type: 'error', message: `二维码刷新失败: ${err instanceof Error ? err.message : String(err)}` });
              close();
              return;
            }
          } else if (status === 'confirmed') {
            const accountId = String(statusResp['ilink_bot_id'] ?? '').trim();
            const token = String(statusResp['bot_token'] ?? '').trim();
            const baseUrl = String(statusResp['baseurl'] ?? ILINK_BASE_URL).trim();
            const ilinkUserId = String(statusResp['ilink_user_id'] ?? '').trim();

            if (!accountId || !token) {
              send({ type: 'error', message: '登录确认成功但凭证不完整，请重试' });
              close();
              return;
            }

            // Persist to settings DB (same priority as manually entered values)
            try {
              const appUserId = await authService.getCurrentUserId();
              await Promise.all([
                settingService.setSetting(appUserId, 'WEIXIN_ACCOUNT_ID', accountId),
                settingService.setSetting(appUserId, 'WEIXIN_TOKEN', token),
                ...(baseUrl && baseUrl !== ILINK_BASE_URL
                  ? [settingService.setSetting(appUserId, 'WEIXIN_BASE_URL', baseUrl)]
                  : []),
              ]);
            } catch (err) {
              logger.error('[WeixinQR] Failed to persist credentials:', err);
              send({ type: 'error', message: '登录成功但保存凭证时出错，请手动填写 Account ID 和 Token' });
              close();
              return;
            }

            logger.info(`[WeixinQR] Login confirmed, accountId=${accountId}`);
            send({ type: 'success', accountId, token, ilinkUserId, baseUrl });

            // Kick off the long-poll channel immediately (fire-and-forget)
            weixinChannelTask.startWeixinChannel().catch((err) =>
              logger.error('[WeixinQR] Failed to start channel after login:', err),
            );
            close();
            return;
          }
        }

        // Timed out
        send({ type: 'error', message: '微信登录超时，请重新发起' });
        close();
      } catch (err) {
        logger.error('[WeixinQR] Unexpected error:', err);
        send({ type: 'error', message: `登录流程出错: ${err instanceof Error ? err.message : String(err)}` });
        close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
