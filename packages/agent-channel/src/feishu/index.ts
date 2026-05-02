// Webhook-based channel (HTTP event subscription)
export { FeishuChannel } from './feishu-channel';
export { FeishuClient } from './feishu-client';

// WebSocket-based channel (real-time connection)
export {
  FeishuWSChannel,
  ConnectionState,
  type FeishuWSChannelConfig,
  type FeishuWSMessageHandler,
  type ConnectionStateHandler,
} from './feishu-ws-channel';

export type {
  FeishuChannelConfig,
  FeishuChallengeEvent,
  FeishuEventV2,
  FeishuMessageReceiveEvent,
  FeishuTokenResponse,
  FeishuSendMessageRequest,
  FeishuSendMessageResponse,
} from './types';
