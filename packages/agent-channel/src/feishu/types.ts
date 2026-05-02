/**
 * Feishu Open Platform event types
 * Ref: https://open.feishu.cn/document/server-docs/im-v1/message/events/receive
 */

export interface FeishuChannelConfig {
  appId: string;
  appSecret: string;
  verificationToken?: string;
  encryptKey?: string;
}

// ============== Event Subscription ==============

/** Challenge request for URL verification */
export interface FeishuChallengeEvent {
  challenge: string;
  token: string;
  type: 'url_verification';
}

/** Event v2 wrapper */
export interface FeishuEventV2<T = unknown> {
  schema: '2.0';
  header: {
    event_id: string;
    event_type: string;
    create_time: string;
    token: string;
    app_id: string;
    tenant_key: string;
  };
  event: T;
}

/** im.message.receive_v1 event payload */
export interface FeishuMessageReceiveEvent {
  sender: {
    sender_id: {
      union_id?: string;
      user_id?: string;
      open_id: string;
    };
    sender_type: string;
    tenant_key: string;
  };
  message: {
    message_id: string;
    root_id?: string;
    parent_id?: string;
    create_time: string;
    update_time?: string;
    chat_id: string;
    chat_type: 'p2p' | 'group';
    message_type: string;
    content: string; // JSON string
    mentions?: Array<{
      key: string;
      id: { union_id?: string; user_id?: string; open_id?: string };
      name: string;
      tenant_key?: string;
    }>;
  };
}

// ============== API Types ==============

export interface FeishuTokenResponse {
  code: number;
  msg: string;
  tenant_access_token: string;
  expire: number;
}

export interface FeishuSendMessageRequest {
  receive_id: string;
  msg_type: 'text' | 'interactive' | 'post';
  content: string;
}

export interface FeishuSendMessageResponse {
  code: number;
  msg: string;
  data?: {
    message_id: string;
  };
}
