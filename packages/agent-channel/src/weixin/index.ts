export { WeixinChannel, type WeixinMessageHandler } from './weixin-channel';
export { WeixinClient, ILINK_BASE_URL, WEIXIN_CDN_BASE_URL } from './weixin-client';
export { extractText, guessChatType, toChannelMessage } from './message-adapter';
export {
  aes128EcbEncrypt,
  aes128EcbDecrypt,
  aesPaddedSize,
  parseAesKey,
  generateAesKey,
  encodeAesKeyForApi,
} from './crypto';
export type {
  WeixinChannelConfig,
  ILinkInboundMessage,
  ILinkMessageItem,
  ILinkMediaRef,
  ILinkGetUpdatesResponse,
  ILinkSendMessageResponse,
  ILinkGetConfigResponse,
  ILinkGetUploadUrlResponse,
} from './types';
export {
  ITEM_TEXT,
  ITEM_IMAGE,
  ITEM_VOICE,
  ITEM_FILE,
  ITEM_VIDEO,
  MSG_TYPE_BOT,
  MSG_STATE_FINISH,
} from './types';
