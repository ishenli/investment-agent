import { describe, it, expect } from 'vitest';
import { ensureThinkOpenTag, hasThinkOpenTag, stripThinkCloseTag } from '../stream';

const OPEN = String.fromCharCode(60, 116, 104, 105, 110, 107, 62);
const CLOSE = String.fromCharCode(60, 47, 116, 104, 105, 110, 107, 62);
const CLOSE_FULL = String.fromCharCode(60, 47, 116, 104, 105, 110, 107, 105, 110, 103, 62);

describe('ensureThinkOpenTag', () => {
  it('推理链带闭合标签但缺开头标签时,应在内容头部补上开头标签', () => {
    const content = `reasoning...${CLOSE}answer`;
    expect(ensureThinkOpenTag(content)).toBe(`${OPEN}reasoning...${CLOSE}answer`);
  });

  it('兼容标准 </thinking> 闭合形式', () => {
    const content = `reasoning...${CLOSE_FULL}answer`;
    expect(ensureThinkOpenTag(content)).toBe(`${OPEN}reasoning...${CLOSE_FULL}answer`);
  });

  it('已带开头标签时保持原样', () => {
    const content = `${OPEN}reasoning...${CLOSE}answer`;
    expect(ensureThinkOpenTag(content)).toBe(content);
  });

  it('无 think 标签时保持原样', () => {
    const content = 'plain answer';
    expect(ensureThinkOpenTag(content)).toBe(content);
  });

  it('空内容直接返回', () => {
    expect(ensureThinkOpenTag('')).toBe('');
  });
});

describe('hasThinkOpenTag', () => {
  it('识别开头标签(含长短两种形式)', () => {
    expect(hasThinkOpenTag(OPEN + 'reason' + CLOSE)).toBe(true);
    const fullOpen = OPEN + 'ing';
    expect(hasThinkOpenTag(fullOpen + 'reason')).toBe(true);
  });

  it('仅闭合标签或无标签时返回 false', () => {
    expect(hasThinkOpenTag('reason' + CLOSE)).toBe(false);
    expect(hasThinkOpenTag('plain')).toBe(false);
    expect(hasThinkOpenTag('')).toBe(false);
  });
});

describe('stripThinkCloseTag', () => {
  it('移除游离闭合标签,兼容两种形式', () => {
    expect(stripThinkCloseTag(`reasoning...${CLOSE}answer`)).toBe('reasoning...answer');
    expect(stripThinkCloseTag(`reasoning...${CLOSE_FULL}answer`)).toBe('reasoning...answer');
  });

  it('空内容直接返回', () => {
    expect(stripThinkCloseTag('')).toBe('');
  });
});