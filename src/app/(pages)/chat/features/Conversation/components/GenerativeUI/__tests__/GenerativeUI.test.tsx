// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import type { UIArtifact } from '@typings/chat/uiArtifact';

// Mock antd-style
vi.mock('antd-style', () => ({
  createStyles: (fn: any) => () => ({ styles: {}, cx: (...args: any[]) => args.join(' ') }),
}));

// Mock react-layout-kit
vi.mock('react-layout-kit', () => ({
  Flexbox: ({ children, ...props }: any) => <div data-testid="flexbox" {...props}>{children}</div>,
}));

// Mock the registry to control component resolution
vi.mock('../registry', () => ({
  getArtifactComponent: vi.fn(),
}));

import { getArtifactComponent } from '../registry';
import GenerativeUIRenderer from '../GenerativeUIRenderer';
import Fallback from '../Fallback';
import StockQuoteCard from '../StockQuoteCard';

const validStockArtifact: UIArtifact = {
  id: 'art-1',
  type: 'stock_quote_card',
  version: 1,
  props: {
    symbol: 'AAPL',
    displayName: 'Apple Inc.',
    price: 189.5,
    change: 2.3,
    changePercent: 1.23,
  },
  fallbackText: 'AAPL: $189.50 (+2.30, +1.23%)',
};

const validStockWithMetrics: UIArtifact = {
  id: 'art-2',
  type: 'stock_quote_card',
  version: 1,
  props: {
    symbol: 'TSLA',
    displayName: 'Tesla Inc.',
    price: 245.0,
    change: -5.2,
    changePercent: -2.08,
    currency: 'USD',
    metrics: [
      { label: 'Market Cap', value: '780B' },
      { label: 'P/E', value: '62.5' },
    ],
  },
  fallbackText: 'TSLA: $245.00 (-5.20, -2.08%)',
};

const unknownTypeArtifact: UIArtifact = {
  id: 'art-3',
  type: 'stock_quote_card',
  version: 1,
  props: { symbol: 'TEST', displayName: 'Test', price: 1, change: 0, changePercent: 0 },
  fallbackText: 'Unknown artifact',
};

const invalidPropsArtifact: UIArtifact = {
  id: 'art-4',
  type: 'stock_quote_card',
  version: 1,
  props: { symbol: '' }, // invalid: symbol must be min(1), missing required fields
  fallbackText: 'Invalid stock card',
};

// ============== Fallback ==============

describe('Fallback', () => {
  it('renders fallbackText', () => {
    render(<Fallback artifact={validStockArtifact} />);
    expect(screen.getByText('AAPL: $189.50 (+2.30, +1.23%)')).toBeDefined();
  });
});

// ============== StockQuoteCard ==============

describe('StockQuoteCard', () => {
  it('renders symbol, name, price, and change', () => {
    render(
      <StockQuoteCard
        symbol="AAPL"
        displayName="Apple Inc."
        price={189.5}
        change={2.3}
        changePercent={1.23}
      />,
    );
    expect(screen.getByText('AAPL')).toBeDefined();
    expect(screen.getByText('Apple Inc.')).toBeDefined();
    expect(screen.getByText('$189.50')).toBeDefined();
    expect(screen.getByText('+2.30 (+1.23%)')).toBeDefined();
  });

  it('renders with CNY currency', () => {
    render(
      <StockQuoteCard
        symbol="600519"
        displayName="贵州茅台"
        price={1850.0}
        change={-15.5}
        changePercent={-0.83}
        currency="CNY"
      />,
    );
    expect(screen.getByText('¥1850.00')).toBeDefined();
    expect(screen.getByText('-15.50 (-0.83%)')).toBeDefined();
  });

  it('renders metrics when provided', () => {
    render(
      <StockQuoteCard
        symbol="TSLA"
        displayName="Tesla Inc."
        price={245.0}
        change={-5.2}
        changePercent={-2.08}
        metrics={[
          { label: 'Market Cap', value: '780B' },
          { label: 'P/E', value: '62.5' },
        ]}
      />,
    );
    expect(screen.getByText('Market Cap')).toBeDefined();
    expect(screen.getByText('780B')).toBeDefined();
    expect(screen.getByText('P/E')).toBeDefined();
    expect(screen.getByText('62.5')).toBeDefined();
  });

  it('renders without metrics', () => {
    const { container } = render(
      <StockQuoteCard
        symbol="GOOG"
        displayName="Alphabet"
        price={140.0}
        change={0}
        changePercent={0}
      />,
    );
    expect(screen.getByText('GOOG')).toBeDefined();
    expect(container.querySelector('[class*="metricsGrid"]')).toBeNull();
  });
});

// ============== GenerativeUIRenderer ==============

describe('GenerativeUIRenderer', () => {
  it('returns null for empty artifacts', () => {
    const { container } = render(<GenerativeUIRenderer artifacts={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null for undefined-like artifacts', () => {
    const { container } = render(<GenerativeUIRenderer artifacts={[] as any} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders fallback for unknown artifact type', () => {
    vi.mocked(getArtifactComponent).mockReturnValue(undefined);
    const artifact: UIArtifact = {
      id: 'art-unknown',
      type: 'stock_quote_card', // type exists in schema but no component registered
      version: 1,
      props: { symbol: 'X', displayName: 'X', price: 1, change: 0, changePercent: 0 },
      fallbackText: 'Fallback for unknown',
    };
    render(<GenerativeUIRenderer artifacts={[artifact]} />);
    expect(screen.getByText('Fallback for unknown')).toBeDefined();
  });

  it('renders fallback for invalid props', () => {
    const MockComponent = (props: any) => <div>Should not render</div>;
    vi.mocked(getArtifactComponent).mockReturnValue(MockComponent);

    render(<GenerativeUIRenderer artifacts={[invalidPropsArtifact]} />);
    expect(screen.getByText('Invalid stock card')).toBeDefined();
    expect(screen.queryByText('Should not render')).toBeNull();
  });

  it('renders component for valid artifact', () => {
    const MockStock = (props: any) => <div>Stock: {props.symbol}</div>;
    vi.mocked(getArtifactComponent).mockReturnValue(MockStock);

    render(<GenerativeUIRenderer artifacts={[validStockArtifact]} />);
    expect(screen.getByText('Stock: AAPL')).toBeDefined();
  });

  it('renders multiple artifacts', () => {
    const MockStock = (props: any) => <div>Stock: {props.symbol}</div>;
    vi.mocked(getArtifactComponent).mockReturnValue(MockStock);

    render(<GenerativeUIRenderer artifacts={[validStockArtifact, validStockWithMetrics]} />);
    expect(screen.getByText('Stock: AAPL')).toBeDefined();
    expect(screen.getByText('Stock: TSLA')).toBeDefined();
  });
});
