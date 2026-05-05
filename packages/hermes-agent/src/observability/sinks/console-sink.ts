/**
 * ConsoleSink — outputs observability events to stdout/stderr.
 *
 * Supports colorized output and JSON Lines format.
 */

import type { ObservabilitySink, ObservabilityEvent, LogLevel } from '../types';

const COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m',   // cyan
  info: '\x1b[32m',    // green
  warn: '\x1b[33m',    // yellow
  error: '\x1b[31m',   // red
};

const RESET = '\x1b[0m';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldEmit(minLevel: LogLevel, eventLevel: LogLevel): boolean {
  return LEVEL_ORDER[eventLevel] >= LEVEL_ORDER[minLevel];
}

export interface ConsoleSinkOptions {
  level?: LogLevel;
  color?: boolean;
}

export class ConsoleSink implements ObservabilitySink {
  readonly name = 'console';
  private level: LogLevel;
  private color: boolean;

  constructor(options: ConsoleSinkOptions = {}) {
    this.level = options.level ?? 'info';
    this.color = options.color ?? true;
  }

  emit(event: ObservabilityEvent): void {
    if (!shouldEmit(this.level, event.level)) return;

    const line = this.format(event);

    if (event.level === 'error') {
      // eslint-disable-next-line no-console
      console.error(line);
    } else if (event.level === 'warn') {
      // eslint-disable-next-line no-console
      console.warn(line);
    } else {
      // eslint-disable-next-line no-console
      console.log(line);
    }
  }

  private format(event: ObservabilityEvent): string {
    const base = `[${new Date(event.timestamp).toISOString()}] ${event.level.toUpperCase().padStart(5)} ${event.type}`;
    const context = `trace=${event.traceId}${event.spanId ? ` span=${event.spanId}` : ''}`;

    if (this.color) {
      const color = COLORS[event.level] ?? '';
      return `${color}${base}${RESET} ${context} ${JSON.stringify(event.payload)}`;
    }

    return `${base} ${context} ${JSON.stringify(event.payload)}`;
  }
}
