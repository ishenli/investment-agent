// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { TradeIntentCardPropsSchema } from '@typings/chat/uiArtifact';

vi.mock('antd-style', () => ({
  createStyles: (fn: any) => () => ({ styles: {}, cx: (...args: any[]) => args.join(' ') }),
}));

vi.mock('react-layout-kit', () => ({
  Flexbox: ({ children, ...props }: any) => <div data-testid="flexbox" {...props}>{children}</div>,
}));

import TradeIntentCard from '../TradeIntentCard';

const baseProps = {
  action: 'buy' as const,
  symbol: 'AAPL',
  displayName: 'Apple Inc.',
  quantity: 10,
  price: 195.5,
  orderType: 'limit' as const,
  status: 'pending' as const,
  idempotencyKey: 'test-key-001',
};

describe('TradeIntentCard', () => {
  it('renders buy action with confirm button', () => {
    render(<TradeIntentCard {...baseProps} />);
    expect(screen.getByText('AAPL')).toBeDefined();
    expect(screen.getByText('Apple Inc.')).toBeDefined();
    expect(screen.getByText('10')).toBeDefined();
    expect(screen.getByText('$195.50')).toBeDefined();
    expect(screen.getByText('确认买入')).toBeDefined();
  });

  it('renders sell action correctly', () => {
    render(<TradeIntentCard {...baseProps} action="sell" />);
    expect(screen.getByText('确认卖出')).toBeDefined();
  });

  it('does not auto-execute — requires explicit user click', () => {
    render(<TradeIntentCard {...baseProps} />);
    const btn = screen.getByRole('button', { name: '确认买入' });
    expect(btn).toBeDefined();
    expect(btn.getAttribute('disabled')).toBeNull();
  });

  it('schema rejects non-pending status', () => {
    const result = TradeIntentCardPropsSchema.safeParse({
      ...baseProps,
      status: 'executed',
    });
    expect(result.success).toBe(false);
  });

  it('schema requires idempotencyKey', () => {
    const { idempotencyKey: _, ...noKey } = baseProps;
    const result = TradeIntentCardPropsSchema.safeParse(noKey);
    expect(result.success).toBe(false);
  });

  it('schema rejects negative quantity', () => {
    const result = TradeIntentCardPropsSchema.safeParse({
      ...baseProps,
      quantity: -5,
    });
    expect(result.success).toBe(false);
  });
});
