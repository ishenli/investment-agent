/**
 * FileSink — append observability events to a file as JSON Lines.
 *
 * Uses synchronous writes for simplicity; buffering can be added if needed.
 */

import type { ObservabilitySink, ObservabilityEvent, LogLevel } from '../types';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldEmit(minLevel: LogLevel, eventLevel: LogLevel): boolean {
  return LEVEL_ORDER[eventLevel] >= LEVEL_ORDER[minLevel];
}

export interface FileSinkOptions {
  /** Absolute or relative path to the log file */
  path: string;
  level?: LogLevel;
}

export class FileSink implements ObservabilitySink {
  readonly name = 'file';
  private filePath: string;
  private level: LogLevel;

  constructor(options: FileSinkOptions) {
    this.filePath = options.path;
    this.level = options.level ?? 'info';
  }

  emit(event: ObservabilityEvent): void {
    if (!shouldEmit(this.level, event.level)) return;

    try {
      const { appendFileSync } = require('fs');
      const line = JSON.stringify({
        ts: event.timestamp,
        level: event.level,
        type: event.type,
        ...event.payload,
      });
      appendFileSync(this.filePath, line + '\n', { encoding: 'utf-8' });
    } catch {
      // File write errors are silently dropped to avoid blocking agent loop
    }
  }
}
