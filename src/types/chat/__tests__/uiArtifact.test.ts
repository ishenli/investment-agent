import { describe, it, expect } from 'vitest';

import {
  UIArtifactSchema,
  StockQuoteCardPropsSchema,
  FundDetailPanelPropsSchema,
  DataChartPropsSchema,
  TradeIntentCardPropsSchema,
  validateUIArtifact,
  validateUIArtifacts,
  MAX_CHART_SERIES,
  MAX_CHART_DATA_POINTS,
  MAX_MINI_TREND_POINTS,
  MAX_HOLDINGS,
} from '../uiArtifact';

// ============== Fixtures ==============

const validStockQuoteCard = {
  id: 'artifact-1',
  type: 'stock_quote_card' as const,
  version: 1 as const,
  props: {
    symbol: 'AAPL',
    displayName: 'Apple Inc.',
    price: 195.5,
    change: 2.3,
    changePercent: 1.19,
    currency: 'USD',
    metrics: [
      { label: 'Market Cap', value: '3.0T' },
      { label: 'P/E', value: '32.1' },
    ],
    miniTrend: [
      { timestamp: 1717200000, value: 190 },
      { timestamp: 1717286400, value: 195.5 },
    ],
  },
  fallbackText: 'AAPL Apple Inc. $195.50 +$2.30 (+1.19%)',
};

const validFundDetailPanel = {
  id: 'artifact-2',
  type: 'fund_detail_panel' as const,
  version: 1 as const,
  props: {
    fundName: 'Vanguard S&P 500 ETF',
    fundCode: 'VOO',
    returnMetrics: [
      { period: '1Y', value: 12.5 },
      { period: '3Y', value: 10.2 },
    ],
    riskLevel: 'medium',
    holdings: [
      { name: 'AAPL', percentage: 7.2 },
      { name: 'MSFT', percentage: 6.8 },
    ],
  },
  fallbackText: 'VOO Vanguard S&P 500 ETF, Risk: medium, 1Y: +12.5%',
};

const validDataChart = {
  id: 'artifact-3',
  type: 'data_chart' as const,
  version: 1 as const,
  props: {
    chartType: 'line',
    title: 'Revenue Growth',
    series: [
      {
        name: 'Revenue',
        data: [
          { x: 'Q1', y: 100 },
          { x: 'Q2', y: 120 },
        ],
      },
    ],
  },
  fallbackText: 'Revenue Growth: Q1=100, Q2=120',
};

const validTradeIntentCard = {
  id: 'artifact-4',
  type: 'trade_intent_card' as const,
  version: 1 as const,
  props: {
    action: 'buy',
    symbol: 'AAPL',
    displayName: 'Apple Inc.',
    quantity: 10,
    price: 195.5,
    orderType: 'limit',
    status: 'pending',
    idempotencyKey: 'trade-abc-123',
  },
  fallbackText: 'Trade Intent: BUY 10 shares of AAPL at $195.50 (pending)',
};

// ============== Base UIArtifact Schema ==============

describe('UIArtifactSchema', () => {
  it('应该接受有效的 artifact', () => {
    const result = UIArtifactSchema.safeParse(validStockQuoteCard);
    expect(result.success).toBe(true);
  });

  it('应该拒绝缺少 id 的 artifact', () => {
    const result = UIArtifactSchema.safeParse({ ...validStockQuoteCard, id: '' });
    expect(result.success).toBe(false);
  });

  it('应该拒绝未知的 artifact type', () => {
    const result = UIArtifactSchema.safeParse({ ...validStockQuoteCard, type: 'unknown_card' });
    expect(result.success).toBe(false);
  });

  it('应该拒绝非法 version', () => {
    const result = UIArtifactSchema.safeParse({ ...validStockQuoteCard, version: 2 });
    expect(result.success).toBe(false);
  });

  it('应该拒绝空 fallbackText', () => {
    const result = UIArtifactSchema.safeParse({ ...validStockQuoteCard, fallbackText: '' });
    expect(result.success).toBe(false);
  });

  it('应该拒绝缺少必需字段的 artifact', () => {
    const result = UIArtifactSchema.safeParse({ id: 'test' });
    expect(result.success).toBe(false);
  });
});

// ============== StockQuoteCard Props ==============

describe('StockQuoteCardPropsSchema', () => {
  it('应该接受有效的股票卡片 props', () => {
    const result = StockQuoteCardPropsSchema.safeParse(validStockQuoteCard.props);
    expect(result.success).toBe(true);
  });

  it('应该接受没有可选字段的 props', () => {
    const result = StockQuoteCardPropsSchema.safeParse({
      symbol: 'AAPL',
      displayName: 'Apple Inc.',
      price: 195.5,
      change: 2.3,
      changePercent: 1.19,
    });
    expect(result.success).toBe(true);
  });

  it('应该拒绝缺少 symbol 的 props', () => {
    const { symbol: _, ...noSymbol } = validStockQuoteCard.props;
    const result = StockQuoteCardPropsSchema.safeParse(noSymbol);
    expect(result.success).toBe(false);
  });

  it('应该拒绝超过上限的 miniTrend 数据点', () => {
    const tooManyPoints = Array.from({ length: MAX_MINI_TREND_POINTS + 1 }, (_, i) => ({
      timestamp: 1717200000 + i * 86400,
      value: 190 + i,
    }));
    const result = StockQuoteCardPropsSchema.safeParse({
      ...validStockQuoteCard.props,
      miniTrend: tooManyPoints,
    });
    expect(result.success).toBe(false);
  });
});

// ============== FundDetailPanel Props ==============

describe('FundDetailPanelPropsSchema', () => {
  it('应该接受有效的基金详情 props', () => {
    const result = FundDetailPanelPropsSchema.safeParse(validFundDetailPanel.props);
    expect(result.success).toBe(true);
  });

  it('应该拒绝无效的 riskLevel', () => {
    const result = FundDetailPanelPropsSchema.safeParse({
      ...validFundDetailPanel.props,
      riskLevel: 'extreme',
    });
    expect(result.success).toBe(false);
  });

  it('应该拒绝超过上限的 holdings', () => {
    const tooManyHoldings = Array.from({ length: MAX_HOLDINGS + 1 }, (_, i) => ({
      name: `Stock${i}`,
      percentage: 4,
    }));
    const result = FundDetailPanelPropsSchema.safeParse({
      ...validFundDetailPanel.props,
      holdings: tooManyHoldings,
    });
    expect(result.success).toBe(false);
  });

  it('应该拒绝超出范围的 percentage', () => {
    const result = FundDetailPanelPropsSchema.safeParse({
      ...validFundDetailPanel.props,
      holdings: [{ name: 'TEST', percentage: 101 }],
    });
    expect(result.success).toBe(false);
  });
});

// ============== DataChart Props ==============

describe('DataChartPropsSchema', () => {
  it('应该接受有效的图表 props', () => {
    const result = DataChartPropsSchema.safeParse(validDataChart.props);
    expect(result.success).toBe(true);
  });

  it('应该拒绝未注册的 chartType', () => {
    const result = DataChartPropsSchema.safeParse({
      ...validDataChart.props,
      chartType: 'scatter',
    });
    expect(result.success).toBe(false);
  });

  it('应该拒绝超过上限的 series 数量', () => {
    const tooManySeries = Array.from({ length: MAX_CHART_SERIES + 1 }, (_, i) => ({
      name: `Series${i}`,
      data: [{ x: 0, y: i }],
    }));
    const result = DataChartPropsSchema.safeParse({
      ...validDataChart.props,
      series: tooManySeries,
    });
    expect(result.success).toBe(false);
  });

  it('应该拒绝超过上限的数据点', () => {
    const tooManyPoints = Array.from({ length: MAX_CHART_DATA_POINTS + 1 }, (_, i) => ({
      x: i,
      y: i * 10,
    }));
    const result = DataChartPropsSchema.safeParse({
      ...validDataChart.props,
      series: [{ name: 'Test', data: tooManyPoints }],
    });
    expect(result.success).toBe(false);
  });

  it('应该拒绝空 series', () => {
    const result = DataChartPropsSchema.safeParse({
      ...validDataChart.props,
      series: [],
    });
    expect(result.success).toBe(false);
  });
});

// ============== TradeIntentCard Props ==============

describe('TradeIntentCardPropsSchema', () => {
  it('应该接受有效的交易意图 props', () => {
    const result = TradeIntentCardPropsSchema.safeParse(validTradeIntentCard.props);
    expect(result.success).toBe(true);
  });

  it('应该只允许 pending 状态', () => {
    const result = TradeIntentCardPropsSchema.safeParse({
      ...validTradeIntentCard.props,
      status: 'executed',
    });
    expect(result.success).toBe(false);
  });

  it('应该拒绝非正数 quantity', () => {
    const result = TradeIntentCardPropsSchema.safeParse({
      ...validTradeIntentCard.props,
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });

  it('应该拒绝无效的 action', () => {
    const result = TradeIntentCardPropsSchema.safeParse({
      ...validTradeIntentCard.props,
      action: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('应该拒绝缺少 idempotencyKey', () => {
    const { idempotencyKey: _, ...noKey } = validTradeIntentCard.props;
    const result = TradeIntentCardPropsSchema.safeParse(noKey);
    expect(result.success).toBe(false);
  });
});

// ============== Validation Helpers ==============

describe('validateUIArtifact', () => {
  it('应该通过有效 artifact 的完整校验（base + props）', () => {
    const result = validateUIArtifact(validStockQuoteCard);
    expect(result.success).toBe(true);
    expect(result.artifact).toBeDefined();
  });

  it('应该拒绝 base schema 不合法的 artifact', () => {
    const result = validateUIArtifact({ id: 'test' });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('应该拒绝 props 不合法的 artifact', () => {
    const result = validateUIArtifact({
      ...validStockQuoteCard,
      props: { symbol: '' },
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('validateUIArtifacts', () => {
  it('应该分离有效和无效的 artifacts', () => {
    const result = validateUIArtifacts([
      validStockQuoteCard,
      { id: 'bad', type: 'unknown' },
      validDataChart,
    ]);
    expect(result.valid).toHaveLength(2);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].index).toBe(1);
  });

  it('应该处理空数组', () => {
    const result = validateUIArtifacts([]);
    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(0);
  });

  it('应该处理全部有效', () => {
    const result = validateUIArtifacts([
      validStockQuoteCard,
      validFundDetailPanel,
      validDataChart,
      validTradeIntentCard,
    ]);
    expect(result.valid).toHaveLength(4);
    expect(result.invalid).toHaveLength(0);
  });
});
