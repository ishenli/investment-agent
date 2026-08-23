import { describe, expect, it } from 'vitest';
import { buildFeishuMessagePayload, MAX_CARD_MARKDOWN_LENGTH } from '../feishu-markdown';

const TRUNCATED_SUFFIX = '\n\n……（内容过长已截断）';

describe('buildFeishuMessagePayload', () => {
  it('returns an interactive card whose markdown element carries the reply', () => {
    const markdown = '**加粗**\n链接：https://x.dev\n- 列表项';
    const payload = buildFeishuMessagePayload(markdown);

    expect(payload.msg_type).toBe('interactive');
    const card = JSON.parse(payload.content);
    expect(card.config.wide_screen_mode).toBe(true);
    expect(card.elements).toEqual([{ tag: 'markdown', content: markdown }]);
  });

  it('truncates overly long content and appends a notice', () => {
    const long = 'a'.repeat(MAX_CARD_MARKDOWN_LENGTH + 100);
    const card = JSON.parse(buildFeishuMessagePayload(long).content) as {
      elements: Array<{ content: string }>;
    };
    const content = card.elements[0].content;

    expect(content.length).toBe(MAX_CARD_MARKDOWN_LENGTH + TRUNCATED_SUFFIX.length);
    expect(content.slice(-TRUNCATED_SUFFIX.length)).toBe(TRUNCATED_SUFFIX);
  });

  it('keeps content at or under the cap without truncation', () => {
    const text = 'x'.repeat(MAX_CARD_MARKDOWN_LENGTH);
    const card = JSON.parse(buildFeishuMessagePayload(text).content) as {
      elements: Array<{ content: string }>;
    };
    expect(card.elements[0].content).toBe(text);
  });

  it('falls back to a placeholder for empty content', () => {
    const card = JSON.parse(buildFeishuMessagePayload('   ').content) as {
      elements: Array<{ content: string }>;
    };
    expect(card.elements[0].content).toBe('（Agent 未能生成回复）');
  });
});