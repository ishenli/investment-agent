// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const send = vi.fn(async () => {});
const updateInputMessage = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@renderer/store/chat', () => ({
  useChatStore: (selector: (s: any) => unknown) =>
    selector({ updateInputMessage, messagesMap: {}, activeId: '', activeTopicId: '' }),
}));

vi.mock('@renderer/(pages)/chat/features/ChatInput/useSend', () => ({
  useSendMessage: () => ({ send }),
}));

vi.mock('react-layout-kit', () => ({
  Flexbox: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@lobehub/ui', () => ({
  Block: ({
    children,
    onClick,
    clickable,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    clickable?: boolean;
  }) => (
    <button type="button" data-clickable={clickable ? 'true' : 'false'} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('antd-style', () => ({
  createStyles: () => () => ({ styles: {} }),
}));

import SuggestionBelowMessage from '../BelowMessage';

describe('SuggestionBelowMessage - per-message rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('带 related 的 assistant 消息都渲染建议，不受"仅最后一条"约束', () => {
    render(
      <div>
        <SuggestionBelowMessage
          id="m1"
          role="assistant"
          content="回复A"
          related={['追问A1', '追问A2']}
        />
        <SuggestionBelowMessage id="m2" role="assistant" content="回复B" related={['追问B1']} />
      </div>,
    );

    expect(screen.getAllByText('可以接着问：')).toHaveLength(2);
    expect(screen.getByText('追问A1')).toBeTruthy();
    expect(screen.getByText('追问B1')).toBeTruthy();
  });

  it('无 related 或为空时不渲染建议', () => {
    render(
      <div>
        <SuggestionBelowMessage id="m1" role="assistant" content="无建议" related={[]} />
        <SuggestionBelowMessage id="m2" role="assistant" content="无建议" />
      </div>,
    );

    expect(screen.queryByText('可以接着问：')).toBeNull();
  });

  it('超过 3 条只显示前 3', () => {
    render(
      <SuggestionBelowMessage
        id="m1"
        role="assistant"
        content="回复"
        related={['a', 'b', 'c', 'd', 'e']}
      />,
    );

    expect(screen.getByText('a')).toBeTruthy();
    expect(screen.getByText('b')).toBeTruthy();
    expect(screen.getByText('c')).toBeTruthy();
    expect(screen.queryByText('d')).toBeNull();
    expect(screen.queryByText('e')).toBeNull();
  });

  it('点击建议填入输入框并发送', () => {
    render(
      <SuggestionBelowMessage id="m1" role="assistant" content="回复" related={['追问X']} />,
    );

    fireEvent.click(screen.getByText('追问X'));

    expect(updateInputMessage).toHaveBeenCalledWith('追问X');
    expect(send).toHaveBeenCalledWith({ isWelcomeQuestion: true });
  });
});