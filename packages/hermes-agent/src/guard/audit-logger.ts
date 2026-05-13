/**
 * Audit Logger for Permission System
 *
 * Records permission and content guard decisions for observability.
 */

import type { AuditLogEntry } from '../permission/types';

/**
 * Audit logger interface.
 */
export interface AuditLogger {
  /** Log an audit entry */
  log(entry: Omit<AuditLogEntry, 'timestamp'>): void;
}

/**
 * Console-based audit logger for development.
 */
export class ConsoleAuditLogger implements AuditLogger {
  private readonly enabled: boolean;

  constructor(enabled: boolean = process.env.NODE_ENV === 'development') {
    this.enabled = enabled;
  }

  log(entry: Omit<AuditLogEntry, 'timestamp'>): void {
    if (!this.enabled) return;

    const fullEntry: AuditLogEntry = {
      ...entry,
      timestamp: Date.now(),
    };

    const status = entry.decision === 'allowed' ? '✓' : '✗';
    const policy = entry.policy.toUpperCase();
    const confirmation = entry.confirmationRequested 
      ? ` [confirm: ${entry.confirmationResult}]` 
      : '';

    console.warn(
      `[Audit] ${status} ${entry.toolName} (${entry.toolCategory}/${entry.permissionLevel}) ` +
      `policy=${policy}${confirmation} ` +
      (entry.reason ? `reason=${entry.reason} ` : '') +
      (entry.contentGuardPattern ? `pattern=${entry.contentGuardPattern}` : '')
    );

    // Optionally log full entry as JSON for debugging
    if (process.env.HERMES_AUDIT_VERBOSE === 'true') {
      console.warn(JSON.stringify(fullEntry, null, 2));
    }
  }
}

/**
 * No-op audit logger that silently discards all entries.
 */
export class NoOpAuditLogger implements AuditLogger {
  log(_entry: Omit<AuditLogEntry, 'timestamp'>): void {
    // No-op
  }
}

/**
 * Composite audit logger that forwards to multiple loggers.
 */
export class CompositeAuditLogger implements AuditLogger {
  private readonly loggers: AuditLogger[];

  constructor(...loggers: AuditLogger[]) {
    this.loggers = loggers;
  }

  log(entry: Omit<AuditLogEntry, 'timestamp'>): void {
    for (const logger of this.loggers) {
      try {
        logger.log(entry);
      } catch (error) {
        // Don't let one logger failure affect others
        console.error('[AuditLogger] Logger error:', error);
      }
    }
  }
}

/**
 * Default audit logger instance.
 */
export const defaultAuditLogger = new ConsoleAuditLogger();
