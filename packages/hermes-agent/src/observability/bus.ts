/**
 * ObservabilityBus — central event dispatcher.
 *
 * Receives trace/span/metric events and forwards them to all configured sinks
 * and callbacks. Failures in one consumer do NOT affect others.
 */

import type {
  ObservabilityConfig,
  ObservabilitySink,
  ObservabilityEvent,
  LogLevel,
  SinkConfig,
  TraceStartEvent,
  SpanStartEvent,
  SpanEndEvent,
  TraceEndEvent,
  MetricEvent,
} from './types';

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function levelAtLeast(min: LogLevel, actual: LogLevel): boolean {
  return LOG_LEVEL_ORDER[actual] >= LOG_LEVEL_ORDER[min];
}

function isShorthandSinkConfig(s: SinkConfig): s is Extract<SinkConfig, { type: string }> {
  return typeof s === 'object' && s !== null && 'type' in s && !('emit' in s);
}

export class ObservabilityBus {
  private sinks: ObservabilitySink[] = [];
  private callbacks: ObservabilityConfig['callbacks'] = {};
  private level: LogLevel = 'info';
  private sampleRate: number = 1;
  private enabled: boolean = true;
  private closed = false;

  constructor(config: ObservabilityConfig) {
    this.enabled = config.enabled ?? true;
    this.level = config.level ?? 'info';
    this.sampleRate = Math.max(0, Math.min(1, config.sampleRate ?? 1));
    this.callbacks = config.callbacks ?? {};

    // Resolve sink configs to instances
    for (const sinkConfig of config.sinks ?? []) {
      const sink = this.resolveSink(sinkConfig);
      if (sink) this.sinks.push(sink);
    }
  }

  private resolveSink(config: SinkConfig): ObservabilitySink | null {
    if (typeof config === 'object' && config !== null && 'emit' in config) {
      return config as ObservabilitySink;
    }
    if (!isShorthandSinkConfig(config)) return null;

    switch (config.type) {
      case 'console': {
        const { ConsoleSink } = require('./sinks/console-sink');
        return new ConsoleSink({
          level: config.level,
          color: config.color,
        });
      }
      case 'file': {
        const { FileSink } = require('./sinks/file-sink');
        return new FileSink({
          path: config.path,
          level: config.level,
        });
      }
      default:
        return null;
    }
  }

  /** Check whether a traceId passes sampling */
  private shouldSample(traceId: string): boolean {
    if (this.sampleRate >= 1) return true;
    if (this.sampleRate <= 0) return false;
    // Simple deterministic sampling based on hash of traceId
    let hash = 0;
    for (let i = 0; i < traceId.length; i++) {
      hash = (hash * 31 + traceId.charCodeAt(i)) & 0x7fffffff;
    }
    return (hash % 1000) / 1000 < this.sampleRate;
  }

  /** Emit an event to all sinks and callbacks */
  emit(event: ObservabilityEvent): void {
    if (this.closed || !this.enabled) return;
    if (!this.shouldSample(event.traceId)) return;
    if (!levelAtLeast(this.level, event.level)) return;

    // Fire to sinks in parallel (fire-and-forget)
    for (const sink of this.sinks) {
      try {
        const result = sink.emit(event);
        if (result && typeof result.then === 'function') {
          result.catch(() => {
            /* silently drop sink errors */
          });
        }
      } catch {
        /* silently drop synchronous sink errors */
      }
    }

    // Fire callbacks (fire-and-forget)
    this.emitCallbacks(event);
  }

  private emitCallbacks(event: ObservabilityEvent): void {
    try {
      switch (event.type) {
        case 'trace_start':
          this.callbacks?.onTraceStart?.(event.payload as TraceStartEvent);
          break;
        case 'span_start':
          this.callbacks?.onSpanStart?.(event.payload as SpanStartEvent);
          break;
        case 'span_end':
          this.callbacks?.onSpanEnd?.(event.payload as SpanEndEvent);
          break;
        case 'trace_end':
          this.callbacks?.onTraceEnd?.(event.payload as TraceEndEvent);
          break;
        case 'metric':
          this.callbacks?.onMetric?.(event.payload as MetricEvent);
          break;
      }
    } catch {
      /* callback errors must not propagate */
    }
  }

  async flush(): Promise<void> {
    if (this.closed) return;
    const flushes = this.sinks
      .map((s) => s.flush?.())
      .filter((p): p is Promise<void> => p !== undefined);
    await Promise.all(flushes);
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    const closes = this.sinks
      .map((s) => s.close?.())
      .filter((p): p is Promise<void> | void => p !== undefined);
    await Promise.all(closes);
  }
}

/** Factory: create an ObservabilityBus from configuration */
export function createObservability(config?: ObservabilityConfig): ObservabilityBus | undefined {
  if (!config || (config.enabled === false)) return undefined;
  return new ObservabilityBus(config);
}
