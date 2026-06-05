import { describe, expect, it } from 'vitest';

import { LOADING_FLAT } from '@renderer/const/message';
import { ChatMessage } from '@typings/message';

import { generateMarkdown } from '../template';

const baseParams = {
  title: 'Test Chat',
  includeTool: false,
  includeUser: true,
  withSystemRole: false,
  withRole: false,
  systemRole: '',
};

describe('ShareModal generateMarkdown', () => {
  it('should include uiArtifact fallbackText as blockquote', () => {
    const messages = [
      {
        id: '1',
        content: 'Here is your stock info',
        role: 'assistant',
        createdAt: Date.now(),
        uiArtifacts: [
          { id: 'a1', type: 'stock_quote_card', fallbackText: 'AAPL $195.50 +2.30 (+1.19%)' },
        ],
      },
    ] as ChatMessage[];

    const result = generateMarkdown({ ...baseParams, messages });
    expect(result).toContain('Here is your stock info');
    expect(result).toContain('> AAPL $195.50 +2.30 (+1.19%)');
  });

  it('should include multiple artifact fallbacks', () => {
    const messages = [
      {
        id: '1',
        content: 'Comparison of stocks',
        role: 'assistant',
        createdAt: Date.now(),
        uiArtifacts: [
          { id: 'a1', type: 'stock_quote_card', fallbackText: 'AAPL $195.50' },
          { id: 'a2', type: 'stock_quote_card', fallbackText: 'GOOG $180.00' },
        ],
      },
    ] as ChatMessage[];

    const result = generateMarkdown({ ...baseParams, messages });
    expect(result).toContain('> AAPL $195.50');
    expect(result).toContain('> GOOG $180.00');
  });

  it('should not break when uiArtifacts is undefined', () => {
    const messages = [
      {
        id: '1',
        content: 'Plain message',
        role: 'assistant',
        createdAt: Date.now(),
      },
    ] as ChatMessage[];

    const result = generateMarkdown({ ...baseParams, messages });
    expect(result).toContain('Plain message');
  });

  it('should not break when uiArtifacts is empty array', () => {
    const messages = [
      {
        id: '1',
        content: 'No artifacts here',
        role: 'assistant',
        createdAt: Date.now(),
        uiArtifacts: [],
      },
    ] as ChatMessage[];

    const result = generateMarkdown({ ...baseParams, messages });
    expect(result).toContain('No artifacts here');
    expect(result).not.toContain('undefined');
  });

  it('should filter loading messages but keep artifact messages', () => {
    const messages = [
      {
        id: '1',
        content: LOADING_FLAT,
        role: 'assistant',
        createdAt: Date.now(),
      },
      {
        id: '2',
        content: 'Stock data',
        role: 'assistant',
        createdAt: Date.now(),
        uiArtifacts: [
          { id: 'a1', type: 'stock_quote_card', fallbackText: 'TSLA $250.00' },
        ],
      },
    ] as ChatMessage[];

    const result = generateMarkdown({ ...baseParams, messages });
    expect(result).not.toContain(LOADING_FLAT);
    expect(result).toContain('Stock data');
    expect(result).toContain('> TSLA $250.00');
  });
});
