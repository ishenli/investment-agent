import type { ChannelMessage } from '../types';
import type { FeishuEventV2, FeishuMessageReceiveEvent } from './types';

/**
 * Convert Feishu im.message.receive_v1 event to generic ChannelMessage
 */
export function toChannelMessage(
  event: FeishuEventV2<FeishuMessageReceiveEvent>,
): ChannelMessage | null {
  const { sender, message } = event.event;

  // Extract text content from message
  const content = extractTextContent(message.message_type, message.content);
  if (content === null) return null;

  return {
    id: message.message_id,
    channelId: `feishu:${message.chat_id}`,
    platform: 'feishu',
    userId: sender.sender_id.open_id,
    content,
    rawContent: message.content,
    timestamp: parseInt(message.create_time, 10),
    metadata: {
      chatType: message.chat_type,
      messageType: message.message_type,
      mentions: message.mentions,
      rootId: message.root_id,
      parentId: message.parent_id,
    },
  };
}

/**
 * Extract plain text from Feishu message content JSON
 */
function extractTextContent(messageType: string, contentJson: string): string | null {
  try {
    const parsed = JSON.parse(contentJson);

    switch (messageType) {
      case 'text':
        return parsed.text ?? null;
      case 'post': {
        // Rich text: extract all text segments
        const lines: string[] = [];
        for (const lang of Object.values(parsed) as Array<{ content?: Array<Array<{ tag: string; text?: string }>> }>) {
          if (lang?.content) {
            for (const line of lang.content) {
              const texts = line
                .filter((seg) => seg.tag === 'text')
                .map((seg) => seg.text ?? '');
              lines.push(texts.join(''));
            }
          }
        }
        return lines.join('\n') || null;
      }
      default:
        // Unsupported message types (image, file, etc.) - skip
        return null;
    }
  } catch {
    return null;
  }
}
