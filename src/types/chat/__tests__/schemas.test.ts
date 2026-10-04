import { describe, expect, it } from 'vitest';

import { UpdateMessageSchema } from '../schemas';

describe('UpdateMessageSchema', () => {
  it('保留 related 追问列表供消息持久化', () => {
    const related = ['继续持有还是减仓？', '后续财报应关注哪些指标？'];

    const result = UpdateMessageSchema.parse({
      id: 'assistant-message-id',
      content: '财报分析内容',
      related,
    });

    expect(result.related).toEqual(related);
  });

  it('允许用空数组清除 related', () => {
    const result = UpdateMessageSchema.parse({
      id: 'assistant-message-id',
      related: [],
    });

    expect(result.related).toEqual([]);
  });
});
