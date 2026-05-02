/**
 * Weixin (WeChat Personal) iLink Bot API types
 * Ref: Tencent iLink Bot API — getupdates / sendmessage / sendtyping / getconfig
 */

// ============== Channel Config ==============

export interface WeixinChannelConfig {
  /** iLink bot token (WEIXIN_TOKEN) */
  token: string;
  /** iLink bot account ID (WEIXIN_ACCOUNT_ID) */
  accountId: string;
  /** iLink API base URL, defaults to https://ilinkai.weixin.qq.com */
  baseUrl?: string;
  /** WeChat CDN base URL for media download/upload */
  cdnBaseUrl?: string;
  /** Allowed sender IDs (allowlist mode). Empty = open to all DMs */
  allowFrom?: string[];
  /** DM policy: 'open' | 'allowlist' | 'disabled'. Default: 'open' */
  dmPolicy?: 'open' | 'allowlist' | 'disabled';
  /** Delay between message chunks (seconds). Default: 0.35 */
  sendChunkDelaySeconds?: number;
}

// ============== iLink Message Item Types ==============

export const ITEM_TEXT = 1;
export const ITEM_IMAGE = 2;
export const ITEM_VOICE = 3;
export const ITEM_FILE = 4;
export const ITEM_VIDEO = 5;

export const MSG_TYPE_BOT = 2;
export const MSG_STATE_FINISH = 2;

// ============== iLink Inbound Message ==============

export interface ILinkMediaRef {
  encrypt_query_param?: string;
  aes_key?: string;
  full_url?: string;
  encrypt_type?: number;
}

export interface ILinkTextItem {
  text: string;
}

export interface ILinkImageItem {
  media?: ILinkMediaRef;
  aeskey?: string;
}

export interface ILinkVoiceItem {
  media?: ILinkMediaRef;
  text?: string; // transcription if available
}

export interface ILinkFileItem {
  media?: ILinkMediaRef;
  file_name?: string;
}

export interface ILinkVideoItem {
  media?: ILinkMediaRef;
}

export interface ILinkRefMsg {
  title?: string;
  message_item?: ILinkMessageItem;
}

export interface ILinkMessageItem {
  type: number;
  text_item?: ILinkTextItem;
  image_item?: ILinkImageItem;
  voice_item?: ILinkVoiceItem;
  file_item?: ILinkFileItem;
  video_item?: ILinkVideoItem;
  ref_msg?: ILinkRefMsg;
}

export interface ILinkInboundMessage {
  /** iLink may return numeric IDs; always coerce via String() before use */
  message_id?: string | number;
  from_user_id?: string | number;
  to_user_id?: string | number;
  room_id?: string | number;
  chat_room_id?: string | number;
  context_token?: string | number;
  msg_type?: number;
  item_list?: ILinkMessageItem[];
}

// ============== iLink API Response Types ==============

export interface ILinkGetUpdatesResponse {
  ret?: number;
  errcode?: number;
  errmsg?: string;
  get_updates_buf?: string;
  msgs?: ILinkInboundMessage[];
  longpolling_timeout_ms?: number;
}

export interface ILinkSendMessageResponse {
  ret?: number;
  errcode?: number;
  errmsg?: string;
  msg?: string;
}

export interface ILinkGetConfigResponse {
  ret?: number;
  errcode?: number;
  typing_ticket?: string;
}

export interface ILinkGetUploadUrlResponse {
  ret?: number;
  errcode?: number;
  upload_param?: string;
  upload_full_url?: string;
}
