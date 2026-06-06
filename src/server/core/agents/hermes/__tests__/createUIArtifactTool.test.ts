import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolRegistry } from '@investment-agent/hermes-agent';
import { UI_ARTIFACT_VERSION } from '@typings/chat/uiArtifact';

vi.mock('@server/core/business', () => ({
  fetchStockPrice: vi.fn(),
  fetchStockMarketInfo: vi.fn(),
  fetchStockCompanyInfo: vi.fn(),
  tavilySearch: vi.fn(),
  searchNotes: vi.fn(),
  createNote: vi.fn(),
  listNotes: vi.fn(),
  getNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
  queryDb: vi.fn(),
  getTransactionHistory: vi.fn(),
  getTransactionHistoryByDateRange: vi.fn(),
  getAccountBalance: vi.fn(),
  getTransactionSummary: vi.fn(),
  addTransaction: vi.fn(),
  queryPortfolio: vi.fn(),
  createAssetMeta: vi.fn(),
  updateAssetMeta: vi.fn(),
  createTaskBiz: vi.fn(),
  listTasksBiz: vi.fn(),
  updateTaskBiz: vi.fn(),
}));

vi.mock('@server/controller/market', () => ({
  MarketBizController: class {
    getList = vi.fn();
    getLatest = vi.fn();
    getDetail = vi.fn();
    save = vi.fn();
    update = vi.fn();
    delete = vi.fn();
  },
}));

vi.mock('@server/controller/report', () => ({
  ReportController: class {
    listReports = vi.fn();
  },
}));

vi.mock('@server/controller/reportDetail', () => ({
  ReportDetailController: class {
    getReport = vi.fn();
  },
}));

vi.mock('@server/base/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { registerBusinessTools } from '../registerBusinessTools';
import type { EngineEventSink } from '@server/core/engine/types';

function createMockEventSink() {
  const sentEvents: unknown[] = [];
  return {
    sentEvents,
    send: vi.fn(async (event: unknown) => {
      sentEvents.push(event);
      return true;
    }),
    sendStatus: vi.fn(),
    sendTextDelta: vi.fn(),
    sendReasoningDelta: vi.fn(),
    sendGrounding: vi.fn(),
    sendRelated: vi.fn(),
    sendToolUseEvent: vi.fn(),
    sendResult: vi.fn(),
    sendAgentError: vi.fn(),
    sendUIArtifact: vi.fn(),
    sendDone: vi.fn(),
  } as unknown as EngineEventSink & { sentEvents: unknown[] };
}

function getHandler(registry: ToolRegistry, name: string) {
  const tool = (registry as any)._tools.get(name);
  if (!tool) throw new Error(`Tool "${name}" not registered`);
  return tool.handler as (id: string, args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>;
}

describe('create_ui_artifact tool', () => {
  let registry: ToolRegistry;
  let sink: ReturnType<typeof createMockEventSink>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new ToolRegistry();
    sink = createMockEventSink();
    registerBusinessTools(registry, { enable: ['create_ui_artifact'] }, sink as any);
  });

  it('should register the tool', () => {
    expect(registry.has('create_ui_artifact')).toBe(true);
  });

  it('should send ui_artifact SSE event for valid stock_quote_card', async () => {
    const handler = getHandler(registry, 'create_ui_artifact');
    const result = await handler('msg-1', {
      artifact_type: 'stock_quote_card',
      props: {
        symbol: 'AAPL',
        displayName: 'Apple Inc.',
        price: 195.5,
        change: 2.3,
        changePercent: 1.19,
      },
      fallback_text: 'AAPL $195.50 +2.30',
    });

    expect(result.isError).toBeUndefined();
    expect(sink.send).toHaveBeenCalledTimes(1);

    const event = sink.sentEvents[0] as any;
    expect(event.type).toBe('ui_artifact');
    expect(event.messageId).toBe('msg-1');
    expect(event.artifact.type).toBe('stock_quote_card');
    expect(event.artifact.version).toBe(UI_ARTIFACT_VERSION);
    expect(event.artifact.props.symbol).toBe('AAPL');
    expect(event.artifact.fallbackText).toBe('AAPL $195.50 +2.30');
    expect(event.artifact.id).toMatch(/^artifact_/);
  });

  it('should block invalid artifact type and not send event', async () => {
    const handler = getHandler(registry, 'create_ui_artifact');
    const result = await handler('msg-2', {
      artifact_type: 'evil_component',
      props: { data: 'anything' },
      fallback_text: 'fallback',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Validation failed for artifact_type=');
    expect(sink.send).not.toHaveBeenCalled();
  });

  it('should block invalid props and not send event', async () => {
    const handler = getHandler(registry, 'create_ui_artifact');
    const result = await handler('msg-3', {
      artifact_type: 'stock_quote_card',
      props: { symbol: '' },
      fallback_text: 'fallback text',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Validation failed for artifact_type=');
    expect(sink.send).not.toHaveBeenCalled();
  });

  it('should block empty fallbackText', async () => {
    const handler = getHandler(registry, 'create_ui_artifact');
    const result = await handler('msg-4', {
      artifact_type: 'stock_quote_card',
      props: {
        symbol: 'TSLA',
        displayName: 'Tesla Inc.',
        price: 250,
        change: 5,
        changePercent: 2.0,
      },
      fallback_text: '',
    });

    expect(result.isError).toBe(true);
    expect(sink.send).not.toHaveBeenCalled();
  });

  it('should return artifact JSON even without eventSink', async () => {
    const noSinkRegistry = new ToolRegistry();
    registerBusinessTools(noSinkRegistry, { enable: ['create_ui_artifact'] });
    const handler = getHandler(noSinkRegistry, 'create_ui_artifact');

    const result = await handler('msg-5', {
      artifact_type: 'stock_quote_card',
      props: {
        symbol: 'GOOG',
        displayName: 'Alphabet Inc.',
        price: 180,
        change: -1.2,
        changePercent: -0.66,
      },
      fallback_text: 'GOOG $180.00',
    });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.type).toBe('stock_quote_card');
    expect(parsed.version).toBe(UI_ARTIFACT_VERSION);
  });

  it('should block data_chart with too many data points', async () => {
    const handler = getHandler(registry, 'create_ui_artifact');
    const tooManyPoints = Array.from({ length: 200 }, (_, i) => ({ x: i, y: i * 10 }));

    const result = await handler('msg-6', {
      artifact_type: 'data_chart',
      props: {
        chartType: 'line',
        series: [{ name: 'Test', data: tooManyPoints }],
      },
      fallback_text: 'Chart data',
    });

    expect(result.isError).toBe(true);
    expect(sink.send).not.toHaveBeenCalled();
  });
});
