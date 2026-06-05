import { describe, expect, it } from 'vitest';

import { LOADING_FLAT } from '@renderer/const/message';
import { ChatMessage } from '@typings/message';

import { generateMarkdown } from './template';

describe('generateMarkdown', () => {
  // 创建测试用的消息数据
  const mockMessages = [
    {
      id: '1',
      content: 'Hello',
      role: 'user',
      createdAt: Date.now(),
    },
    {
      id: '2',
      content: 'Hi there',
      role: 'assistant',
      createdAt: Date.now(),
    },
    {
      id: '3',
      content: LOADING_FLAT,
      role: 'assistant',
      createdAt: Date.now(),
    },
    {
      id: '4',
      content: '{"result": "tool data"}',
      role: 'tool',
      createdAt: Date.now(),
      tool_call_id: 'tool1',
    },
    {
      id: '5',
      content: 'Message with tools',
      role: 'assistant',
      createdAt: Date.now(),
      tools: [{ name: 'calculator', result: '42' }],
    },
  ] as ChatMessage[];

  const defaultParams = {
    messages: mockMessages,
    title: 'Chat Title',
    includeTool: false,
    includeUser: true,
    withSystemRole: false,
    withRole: false,
    systemRole: '',
  };

  it('should filter out loading messages', () => {
    const result = generateMarkdown(defaultParams);

    expect(result).not.toContain(LOADING_FLAT);
  });

  it('should handle messages with special characters', () => {
    const messagesWithSpecialChars = [
      {
        id: '1',
        content: '**Bold** *Italic* `Code`',
        role: 'user',
        createdAt: Date.now(),
      },
    ] as ChatMessage[];

    const result = generateMarkdown({
      ...defaultParams,
      messages: messagesWithSpecialChars,
    });

    expect(result).toContain('**Bold** *Italic* `Code`');
  });

  it('should include uiArtifact fallbackText in output', () => {
    const messagesWithArtifacts = [
      {
        id: '1',
        content: 'Here is your stock quote',
        role: 'assistant',
        createdAt: Date.now(),
        uiArtifacts: [
          { id: 'a1', type: 'stock_quote_card', fallbackText: 'AAPL $195.50 +2.30 (+1.19%)' },
        ],
      },
    ] as ChatMessage[];

    const result = generateMarkdown({ messages: messagesWithArtifacts });
    expect(result).toContain('Here is your stock quote');
    expect(result).toContain('AAPL $195.50 +2.30 (+1.19%)');
  });

  it('should include multiple uiArtifact fallbackTexts', () => {
    const messagesWithArtifacts = [
      {
        id: '1',
        content: 'Comparison',
        role: 'assistant',
        createdAt: Date.now(),
        uiArtifacts: [
          { id: 'a1', type: 'stock_quote_card', fallbackText: 'AAPL $195.50' },
          { id: 'a2', type: 'stock_quote_card', fallbackText: 'GOOG $180.00' },
        ],
      },
    ] as ChatMessage[];

    const result = generateMarkdown({ messages: messagesWithArtifacts });
    expect(result).toContain('AAPL $195.50');
    expect(result).toContain('GOOG $180.00');
  });

  it('should not break when uiArtifacts is empty', () => {
    const messagesNoArtifacts = [
      {
        id: '1',
        content: 'Plain message',
        role: 'assistant',
        createdAt: Date.now(),
        uiArtifacts: [] as Record<string, unknown>[],
      },
    ] as ChatMessage[];

    const result = generateMarkdown({ messages: messagesNoArtifacts });
    expect(result).toContain('Plain message');
    expect(result).not.toContain('undefined');
  });
});
