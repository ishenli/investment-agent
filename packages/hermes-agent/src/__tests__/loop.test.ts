import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@mariozechner/pi-ai', () => ({
  complete: vi.fn(),
  stream: vi.fn(),
}));

import { complete, stream } from '@mariozechner/pi-ai';
import { runAgentLoop } from '../loop';
import { MemoryManager } from '../memory-manager';
import type { AgentConfig } from '../types';
import type { Context } from '@mariozechner/pi-ai';

function makeAssistant(text: string) {
  return {
    role: 'assistant' as const,
    content: [{ type: 'text' as const, text }],
    timestamp: Date.now(),
  };
}

function makeToolCallAssistant(toolName: string, args: Record<string, unknown> = {}) {
  return {
    role: 'assistant' as const,
    content: [{ type: 'toolCall' as const, name: toolName, arguments: args, id: 'tc-1' }],
    timestamp: Date.now(),
  };
}

describe('runAgentLoop memory lifecycle', () => {
  let mockComplete: ReturnType<typeof vi.fn>;
  let mockStream: ReturnType<typeof vi.fn>;
  let baseConfig: AgentConfig;
  let memMgr: MemoryManager;

  beforeEach(() => {
    mockComplete = vi.mocked(complete);
    mockStream = vi.mocked(stream);
    mockComplete.mockResolvedValue(makeAssistant('Done') as any);
    mockStream.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        yield { type: 'text_delta' as const, delta: 'D' };
      },
      result: vi.fn().mockResolvedValue(makeAssistant('Done') as any),
    });

    baseConfig = {
      model: { api: {}, modelId: 'test-model', contextWindow: 0 } as any,
      maxIterations: 5,
      streaming: false,
      streamOptions: {},
    };

    memMgr = new MemoryManager();
    vi.spyOn(memMgr, 'prefetchAll').mockResolvedValue('prefetched');
    vi.spyOn(memMgr, 'syncAll').mockResolvedValue(undefined);
    vi.spyOn(memMgr, 'queuePrefetchAll').mockImplementation(() => {});
    vi.spyOn(memMgr, 'onTurnStart').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function makeContext(userContent: string): Context {
    return {
      systemPrompt: 'You are an assistant.',
      messages: [{ role: 'user', content: userContent, timestamp: Date.now() }],
      tools: [],
    };
  }

  it('skips memory logic when memoryManager is undefined', async () => {
    const context = makeContext('Hello');
    const res = await runAgentLoop(baseConfig, context);
    expect(res.completed).toBe(true);
    // user message + assistant response
    expect(context.messages).toHaveLength(2);
  });

  it('injects memory-context and syncs on completion', async () => {
    const context = makeContext('Hello');
    baseConfig.memoryManager = memMgr;

    const res = await runAgentLoop(baseConfig, context);
    expect(res.completed).toBe(true);
    expect(res.finalResponse).toBe('Done');
    expect(memMgr.prefetchAll).toHaveBeenCalledWith('Hello', '');
    expect(memMgr.syncAll).toHaveBeenCalledWith('Hello', 'Done', '');
    expect(memMgr.queuePrefetchAll).toHaveBeenCalledWith('Hello', '');

    expect(context.messages.length).toBe(3);
    expect((context.messages[0] as any).content).toContain('<memory-context>');
    expect((context.messages[0] as any).content).toContain('prefetched');
    expect((context.messages[1] as any).content).toBe('Hello');
  });

  it('catches prefetch failure and continues normally', async () => {
    const context = makeContext('Hello');
    baseConfig.memoryManager = memMgr;
    vi.mocked(memMgr.prefetchAll).mockRejectedValue(new Error('prefetch boom'));

    const res = await runAgentLoop(baseConfig, context);
    expect(res.completed).toBe(true);
    expect(console.warn).toHaveBeenCalledWith(
      '[AgentLoop] Memory prefetch failed:',
      expect.any(Error),
    );
  });

  it('catches sync failure and still returns completed', async () => {
    const context = makeContext('Hello');
    baseConfig.memoryManager = memMgr;
    vi.mocked(memMgr.syncAll).mockRejectedValue(new Error('sync boom'));

    const res = await runAgentLoop(baseConfig, context);
    expect(res.completed).toBe(true);
    expect(console.warn).toHaveBeenCalledWith('[AgentLoop] Memory sync failed:', expect.any(Error));
  });

  it('strips stale ephemeral memory-context before injecting new one', async () => {
    const context: Context = {
      systemPrompt: 'sys',
      messages: [
        {
          role: 'user',
          content: '<memory-context>stale block</memory-context>',
          timestamp: Date.now(),
        },
        { role: 'user', content: 'Hello', timestamp: Date.now() },
      ],
      tools: [],
    };
    baseConfig.memoryManager = memMgr;

    await runAgentLoop(baseConfig, context);
    const memoryBlocks = context.messages.filter(
      (m) =>
        m.role === 'user' &&
        typeof m.content === 'string' &&
        m.content.startsWith('<memory-context>'),
    );
    expect(memoryBlocks).toHaveLength(1);
    expect(memoryBlocks[0].content).toContain('prefetched');
    expect(memoryBlocks[0].content).not.toContain('stale block');
  });

  it('passes turnNumber to onTurnStart', async () => {
    const context = makeContext('Hello');
    baseConfig.memoryManager = memMgr;
    baseConfig.turnNumber = 7;

    await runAgentLoop(baseConfig, context);
    expect(memMgr.onTurnStart).toHaveBeenCalledWith(7, 'Hello');
  });

  it('skips prefetch when signal is already aborted', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    baseConfig.memoryManager = memMgr;
    baseConfig.streamOptions = { signal: ctrl.signal };
    const context = makeContext('Hello');

    const res = await runAgentLoop(baseConfig, context);
    expect(res.completed).toBe(false);
    expect(memMgr.prefetchAll).not.toHaveBeenCalled();
  });

  it('syncs best-effort on budget exhaustion', async () => {
    const context = makeContext('Hello');
    baseConfig.memoryManager = memMgr;
    baseConfig.maxIterations = 1;

    // Return a tool call so the loop doesn't complete on first iteration
    // and instead falls through to budget exhaustion after tool execution.
    mockComplete.mockResolvedValue(makeToolCallAssistant('noop') as any);

    const res = await runAgentLoop(baseConfig, context);
    expect(res.completed).toBe(false);
    expect(res.error).toContain('Max iterations');
    expect(memMgr.syncAll).toHaveBeenCalledWith('Hello', '', '');
    expect(memMgr.queuePrefetchAll).toHaveBeenCalledWith('Hello', '');
  });

  it('calls stream when streaming=true with onTextDelta callback', async () => {
    const context = makeContext('Hello');
    baseConfig.streaming = true;
    baseConfig.callbacks = { onTextDelta: vi.fn() };

    await runAgentLoop(baseConfig, context);
    expect(stream).toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
  });

  it('records skill tools as skill_use spans', async () => {
    const context = makeContext('Use a relevant skill');
    mockComplete
      .mockResolvedValueOnce(makeToolCallAssistant('skill_view', { name: 'macro-analysis' }) as any)
      .mockResolvedValueOnce(makeAssistant('Done') as any);

    baseConfig.toolExecutor = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: '# Skill: Macro Analysis' }],
      isError: false,
    });

    const tracer = {
      startSpan: vi.fn((traceCtx, name, kind, attributes) => ({
        id: `span-${name}`,
        traceId: traceCtx.traceId,
        name,
        kind,
        status: 'ok',
        startTime: Date.now(),
        events: [],
        attributes,
      })),
      endSpan: vi.fn((span, options) => ({ ...span, ...options })),
      addEvent: vi.fn(),
    };

    await runAgentLoop(
      baseConfig,
      context,
      { traceId: 'tr-test', agentName: 'test-agent', startTime: Date.now() },
      tracer as any,
    );

    expect(tracer.startSpan).toHaveBeenCalledWith(
      expect.any(Object),
      'skill_use',
      'internal',
      expect.objectContaining({
        tool: 'skill_view',
        skillTool: true,
        skillAction: 'view',
        skillName: 'macro-analysis',
      }),
    );
    expect(tracer.endSpan).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'skill_use' }),
      expect.objectContaining({
        status: 'ok',
        attributes: expect.objectContaining({
          skillAction: 'view',
          skillName: 'macro-analysis',
          resultSummary: '# Skill: Macro Analysis',
        }),
      }),
    );
  });
});
