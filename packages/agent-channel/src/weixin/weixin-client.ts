/**
 * Weixin iLink Bot API client
 *
 * Handles all HTTP interactions with Tencent's iLink Bot API:
 * - Long-poll getupdates
 * - sendmessage (text)
 * - getconfig (typing ticket)
 * - getuploadurl + CDN upload for media
 */

import crypto from 'node:crypto';
import type {
  WeixinChannelConfig,
  ILinkGetUpdatesResponse,
  ILinkSendMessageResponse,
  ILinkGetConfigResponse,
  ILinkGetUploadUrlResponse,
} from './types';
import { MSG_TYPE_BOT, MSG_STATE_FINISH, ITEM_TEXT } from './types';
import { aes128EcbEncrypt, aesPaddedSize, encodeAesKeyForApi, generateAesKey } from './crypto';

export const ILINK_BASE_URL = 'https://ilinkai.weixin.qq.com';
export const WEIXIN_CDN_BASE_URL = 'https://novac2c.cdn.weixin.qq.com/c2c';

const ILINK_APP_ID = 'bot';
const CHANNEL_VERSION = '2.2.0';
const ILINK_APP_CLIENT_VERSION = (2 << 16) | (2 << 8) | 0;

const EP_GET_UPDATES = 'ilink/bot/getupdates';
const EP_SEND_MESSAGE = 'ilink/bot/sendmessage';
const EP_GET_CONFIG = 'ilink/bot/getconfig';
const EP_GET_UPLOAD_URL = 'ilink/bot/getuploadurl';

export const LONG_POLL_TIMEOUT_MS = 35_000;
export const API_TIMEOUT_MS = 15_000;
export const SESSION_EXPIRED_ERRCODE = -14;

/** Random WeChat UIN header value — required by iLink */
function randomWechatUin(): string {
  const value = crypto.randomBytes(4).readUInt32BE(0);
  return Buffer.from(String(value), 'utf8').toString('base64');
}

function baseInfo() {
  return { channel_version: CHANNEL_VERSION };
}

function buildHeaders(token: string | null, bodyStr: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    AuthorizationType: 'ilink_bot_token',
    'Content-Length': String(Buffer.byteLength(bodyStr, 'utf8')),
    'X-WECHAT-UIN': randomWechatUin(),
    'iLink-App-Id': ILINK_APP_ID,
    'iLink-App-ClientVersion': String(ILINK_APP_CLIENT_VERSION),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/** Build CDN download URL */
export function cdnDownloadUrl(cdnBaseUrl: string, encryptedQueryParam: string): string {
  return `${cdnBaseUrl.replace(/\/$/, '')}/download?encrypted_query_param=${encodeURIComponent(encryptedQueryParam)}`;
}

/** Build CDN upload URL */
export function cdnUploadUrl(cdnBaseUrl: string, uploadParam: string, filekey: string): string {
  return (
    `${cdnBaseUrl.replace(/\/$/, '')}/upload` +
    `?encrypted_query_param=${encodeURIComponent(uploadParam)}` +
    `&filekey=${encodeURIComponent(filekey)}`
  );
}

/**
 * Weixin iLink API client
 */
export class WeixinClient {
  private token: string;
  private baseUrl: string;
  private cdnBaseUrl: string;
  private accountId: string;

  constructor(config: WeixinChannelConfig) {
    this.token = config.token;
    this.accountId = config.accountId;
    this.baseUrl = (config.baseUrl ?? ILINK_BASE_URL).replace(/\/$/, '');
    this.cdnBaseUrl = (config.cdnBaseUrl ?? WEIXIN_CDN_BASE_URL).replace(/\/$/, '');
  }

  private async apiPost<T>(
    endpoint: string,
    payload: Record<string, unknown>,
    timeoutMs = API_TIMEOUT_MS,
  ): Promise<T> {
    const body = JSON.stringify({ ...payload, base_info: baseInfo() });
    const url = `${this.baseUrl}/${endpoint}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: buildHeaders(this.token, body),
        body,
        signal: controller.signal,
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`iLink POST ${endpoint} HTTP ${response.status}: ${text.slice(0, 200)}`);
      }
      return JSON.parse(text) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Long-poll for new messages.
   * On timeout the caller should retry with the same syncBuf.
   */
  async getUpdates(syncBuf: string, timeoutMs = LONG_POLL_TIMEOUT_MS): Promise<ILinkGetUpdatesResponse> {
    try {
      return await this.apiPost<ILinkGetUpdatesResponse>(
        EP_GET_UPDATES,
        { get_updates_buf: syncBuf },
        timeoutMs + 5_000, // outer timeout slightly longer than server-side
      );
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Timeout — return empty response, caller retries
        return { ret: 0, msgs: [], get_updates_buf: syncBuf };
      }
      throw err;
    }
  }

  /**
   * Send a text message.
   * Returns the raw API response so callers can inspect errcode.
   */
  async sendTextMessage(
    toUserId: string,
    text: string,
    contextToken: string | null,
    clientId: string,
  ): Promise<ILinkSendMessageResponse> {
    if (!text.trim()) throw new Error('sendTextMessage: text must not be empty');

    const message: Record<string, unknown> = {
      from_user_id: '',
      to_user_id: toUserId,
      client_id: clientId,
      message_type: MSG_TYPE_BOT,
      message_state: MSG_STATE_FINISH,
      item_list: [{ type: ITEM_TEXT, text_item: { text } }],
    };
    if (contextToken) message['context_token'] = contextToken;

    return this.apiPost<ILinkSendMessageResponse>(EP_SEND_MESSAGE, { msg: message });
  }

  /**
   * Fetch typing ticket for a user (getconfig).
   */
  async getConfig(userId: string, contextToken: string | null): Promise<ILinkGetConfigResponse> {
    const payload: Record<string, unknown> = { ilink_user_id: userId };
    if (contextToken) payload['context_token'] = contextToken;
    return this.apiPost<ILinkGetConfigResponse>(EP_GET_CONFIG, payload, 10_000);
  }

  /**
   * Get upload URL from iLink, then upload encrypted bytes to CDN.
   *
   * Returns the `encrypted_query_param` and `aes_key_for_api` needed
   * to construct the outbound media item_list entry.
   */
  async uploadMedia(
    toUserId: string,
    mediaType: number,
    plaintext: Buffer,
  ): Promise<{ encryptedQueryParam: string; aesKeyForApi: string; ciphertextSize: number; rawMd5: string }> {
    const aesKey = generateAesKey();
    const ciphertext = aes128EcbEncrypt(plaintext, aesKey);
    const rawMd5 = crypto.createHash('md5').update(plaintext).digest('hex');
    const filekey = crypto.randomBytes(16).toString('hex');

    const uploadResp = await this.apiPost<ILinkGetUploadUrlResponse>(
      EP_GET_UPLOAD_URL,
      {
        filekey,
        media_type: mediaType,
        to_user_id: toUserId,
        rawsize: plaintext.length,
        rawfilemd5: rawMd5,
        filesize: aesPaddedSize(plaintext.length),
        no_need_thumb: true,
        aeskey: aesKey.toString('hex'),
      },
    );

    const uploadFullUrl = uploadResp.upload_full_url ?? '';
    const uploadParam = uploadResp.upload_param ?? '';

    let uploadUrl: string;
    if (uploadFullUrl) {
      uploadUrl = uploadFullUrl;
    } else if (uploadParam) {
      uploadUrl = cdnUploadUrl(this.cdnBaseUrl, uploadParam, filekey);
    } else {
      throw new Error(`getUploadUrl returned neither upload_param nor upload_full_url`);
    }

    // Upload ciphertext to CDN
    const uploadController = new AbortController();
    const uploadTimer = setTimeout(() => uploadController.abort(), 120_000);
    let encryptedQueryParam: string;
    try {
      const cdnResp = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: ciphertext.buffer.slice(ciphertext.byteOffset, ciphertext.byteOffset + ciphertext.byteLength) as ArrayBuffer,
        signal: uploadController.signal,
      });
      if (cdnResp.status !== 200) {
        const body = await cdnResp.text();
        throw new Error(`CDN upload HTTP ${cdnResp.status}: ${body.slice(0, 200)}`);
      }
      const xParam = cdnResp.headers.get('x-encrypted-param');
      if (!xParam) {
        const body = await cdnResp.text();
        throw new Error(`CDN upload missing x-encrypted-param header: ${body.slice(0, 200)}`);
      }
      // Drain response
      await cdnResp.body?.cancel();
      encryptedQueryParam = xParam;
    } finally {
      clearTimeout(uploadTimer);
    }

    return {
      encryptedQueryParam,
      aesKeyForApi: encodeAesKeyForApi(aesKey),
      ciphertextSize: ciphertext.length,
      rawMd5,
    };
  }

  /**
   * Send a media item message (image, file, video) via iLink sendmessage.
   */
  async sendMediaMessage(
    toUserId: string,
    mediaItem: Record<string, unknown>,
    contextToken: string | null,
    clientId: string,
  ): Promise<ILinkSendMessageResponse> {
    const message: Record<string, unknown> = {
      from_user_id: '',
      to_user_id: toUserId,
      client_id: clientId,
      message_type: MSG_TYPE_BOT,
      message_state: MSG_STATE_FINISH,
      item_list: [mediaItem],
    };
    if (contextToken) message['context_token'] = contextToken;
    return this.apiPost<ILinkSendMessageResponse>(EP_SEND_MESSAGE, { msg: message });
  }

  getAccountId(): string {
    return this.accountId;
  }
}
