/**
 * Outgoing message formatting for the Feishu channel.
 *
 * Hermes channel replies are Markdown-formatted text, but a Feishu `text`
 * message renders plain text only and ignores Markdown. Sending the reply as
 * an `interactive` message card whose single element is `markdown` lets Feishu
 * render the Markdown subset it supports (bold, italics, strikethrough, links,
 * inline code, newlines). Unsupported constructs (tables, headings, fenced
 * code) fall back to literal text in the card rather than being dropped.
 */

// Feishu card `markdown` element text is capped at ~4096 chars. Cap below that
// so a long agent reply never trips the API, and append a notice when cut.
export const MAX_CARD_MARKDOWN_LENGTH = 4000;

const TRUNCATED_SUFFIX = '\n\n……（内容过长已截断）';
const EMPTY_FALLBACK = '（Agent 未能生成回复）';

export interface FeishuCard {
  config: { wide_screen_mode: boolean };
  elements: Array<{ tag: 'markdown'; content: string }>;
}

function clampCardMarkdown(content: string): string {
  if (content.length <= MAX_CARD_MARKDOWN_LENGTH) return content;
  return `${content.slice(0, MAX_CARD_MARKDOWN_LENGTH)}${TRUNCATED_SUFFIX}`;
}

/**
 * Build the `data` payload accepted by `im.v1.message.reply` / `create` for an
 * `interactive` (card) message. `content` is a JSON string of the card shape
 * expected by the Feishu API.
 */
export function buildFeishuMessagePayload(content: string): {
  msg_type: 'interactive';
  content: string;
} {
  const text = content.trim() ? content : EMPTY_FALLBACK;
  const card: FeishuCard = {
    config: { wide_screen_mode: true },
    elements: [{ tag: 'markdown', content: clampCardMarkdown(text) }],
  };
  return { msg_type: 'interactive', content: JSON.stringify(card) };
}