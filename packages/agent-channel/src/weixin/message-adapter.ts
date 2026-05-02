/**
 * Weixin message adapter
 *
 * Converts iLink inbound messages to generic ChannelMessage,
 * and provides text extraction from item_list.
 */

import type { ChannelMessage } from '../types';
import type { ILinkInboundMessage, ILinkMessageItem } from './types';
import { ITEM_TEXT, ITEM_IMAGE, ITEM_VOICE, ITEM_FILE, ITEM_VIDEO } from './types';

// Safely coerce any value to a trimmed string (iLink API may return numeric IDs)
function toStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

// ============== Text Extraction ==============

/**
 * Extract the text content from an iLink item_list.
 * Handles quoted/referenced messages by prepending a context prefix.
 */
export function extractText(itemList: ILinkMessageItem[]): string {
  for (const item of itemList) {
    if (item.type === ITEM_TEXT) {
      const text = item.text_item?.text ?? '';
      const ref = item.ref_msg;
      const refItem = ref?.message_item;

      if (refItem) {
        if (
          refItem.type === ITEM_IMAGE ||
          refItem.type === ITEM_VIDEO ||
          refItem.type === ITEM_FILE ||
          refItem.type === ITEM_VOICE
        ) {
          const title = ref?.title ?? '';
          const prefix = title ? `[引用媒体: ${title}]\n` : '[引用媒体]\n';
          return `${prefix}${text}`.trim();
        }
        // Referenced text message
        const parts: string[] = [];
        if (ref?.title) parts.push(ref.title);
        const refText = extractText([refItem]);
        if (refText) parts.push(refText);
        if (parts.length > 0) {
          return `[引用: ${parts.join(' | ')}]\n${text}`.trim();
        }
      }
      return text;
    }
  }

  // Fallback: voice transcription
  for (const item of itemList) {
    if (item.type === ITEM_VOICE) {
      const voiceText = item.voice_item?.text ?? '';
      if (voiceText) return voiceText;
    }
  }

  return '';
}

// ============== Chat type detection ==============

/**
 * Determine if a message is a group chat or DM, and return the effective chat ID.
 */
export function guessChatType(
  message: ILinkInboundMessage,
  accountId: string,
): { chatType: 'group' | 'dm'; effectiveChatId: string } {
  const roomId = toStr(message.room_id ?? message.chat_room_id);
  const toUserId = toStr(message.to_user_id);
  const fromUserId = toStr(message.from_user_id);

  const isGroup =
    Boolean(roomId) ||
    (Boolean(toUserId) && Boolean(accountId) && toUserId !== accountId && message.msg_type === 1);

  if (isGroup) {
    return { chatType: 'group', effectiveChatId: roomId || toUserId || fromUserId };
  }
  return { chatType: 'dm', effectiveChatId: fromUserId };
}

// ============== ChannelMessage conversion ==============

/**
 * Convert an iLink inbound message to a generic ChannelMessage.
 * Returns null if the message has no actionable content.
 */
export function toChannelMessage(
  message: ILinkInboundMessage,
  accountId: string,
): ChannelMessage | null {
  const senderId = toStr(message.from_user_id);
  if (!senderId || senderId === accountId) return null;

  const itemList = message.item_list ?? [];
  const text = extractText(itemList);

  if (!text) return null;

  const { chatType, effectiveChatId } = guessChatType(message, accountId);
  const messageId = toStr(message.message_id);

  return {
    id: messageId || crypto.randomUUID(),
    eventId: messageId || undefined,
    channelId: `weixin:${effectiveChatId}`,
    platform: 'weixin',
    userId: senderId,
    content: text,
    rawContent: message,
    timestamp: Date.now(),
    metadata: {
      chatType,
      contextToken: message.context_token ?? null,
      effectiveChatId,
    },
  };
}
