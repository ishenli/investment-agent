// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

import ConversationSettings, { CHAT_AI_TIPS_SETTING_KEY } from '../page';

describe('ConversationSettings', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('已配置为关闭时回显关闭', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { [CHAT_AI_TIPS_SETTING_KEY]: 'false' } }),
    });

    render(<ConversationSettings />);

    await waitFor(() => {
      const switcher = screen.getByRole('switch') as HTMLButtonElement;
      expect(switcher.getAttribute('aria-checked')).toBe('false');
    });
  });

  it('未配置时默认显示开启', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: {} }) });

    render(<ConversationSettings />);

    await waitFor(() => {
      const switcher = screen.getByRole('switch') as HTMLButtonElement;
      expect(switcher.getAttribute('aria-checked')).toBe('true');
    });
  });

  it('切换后调用 PUT 持久化', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: {} }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: {} }) });

    render(<ConversationSettings />);

    await waitFor(() => {
      const switcher = screen.getByRole('switch') as HTMLButtonElement;
      fireEvent.click(switcher);
      expect(fetchMock).toHaveBeenLastCalledWith('/api/setting', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: CHAT_AI_TIPS_SETTING_KEY, value: 'false' }),
      });
    });
  });
});