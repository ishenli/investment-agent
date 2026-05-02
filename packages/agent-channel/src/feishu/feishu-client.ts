import type {
  FeishuChannelConfig,
  FeishuTokenResponse,
  FeishuSendMessageResponse,
} from './types';

const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';

/**
 * Feishu API client - handles authentication and message sending
 */
export class FeishuClient {
  private config: FeishuChannelConfig;
  private tenantAccessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(config: FeishuChannelConfig) {
    this.config = config;
  }

  /**
   * Get tenant access token (auto-refresh when expired)
   */
  async getAccessToken(): Promise<string> {
    if (this.tenantAccessToken && Date.now() < this.tokenExpiresAt) {
      return this.tenantAccessToken;
    }

    const response = await fetch(
      `${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_id: this.config.appId,
          app_secret: this.config.appSecret,
        }),
      },
    );

    const data = (await response.json()) as FeishuTokenResponse;
    if (data.code !== 0) {
      throw new Error(`Failed to get Feishu access token: ${data.msg}`);
    }

    this.tenantAccessToken = data.tenant_access_token;
    // Refresh 5 minutes before expiry
    this.tokenExpiresAt = Date.now() + (data.expire - 300) * 1000;
    return this.tenantAccessToken;
  }

  /**
   * Send a text message to a chat
   */
  async sendMessage(chatId: string, text: string): Promise<FeishuSendMessageResponse> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `${FEISHU_API_BASE}/im/v1/messages?receive_id_type=chat_id`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receive_id: chatId,
          msg_type: 'text',
          content: JSON.stringify({ text }),
        }),
      },
    );

    const data = (await response.json()) as FeishuSendMessageResponse;
    if (data.code !== 0) {
      throw new Error(`Failed to send Feishu message: ${data.msg}`);
    }

    return data;
  }

  /**
   * Reply to a specific message
   */
  async replyMessage(messageId: string, text: string): Promise<FeishuSendMessageResponse> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `${FEISHU_API_BASE}/im/v1/messages/${messageId}/reply`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          msg_type: 'text',
          content: JSON.stringify({ text }),
        }),
      },
    );

    const data = (await response.json()) as FeishuSendMessageResponse;
    if (data.code !== 0) {
      throw new Error(`Failed to reply Feishu message: ${data.msg}`);
    }

    return data;
  }
}
