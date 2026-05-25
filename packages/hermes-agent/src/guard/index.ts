/**
 * Content Guard - Public API
 *
 * Exports content validation for security risks.
 */

export {
  ContentGuard,
  defaultContentGuard,
  isContentGuardDisabled,
  DANGEROUS_PATTERNS,
  SENSITIVE_FILES,
  type ContentGuardOptions,
} from './content-validator';

export {
  type AuditLogger,
  ConsoleAuditLogger,
  NoOpAuditLogger,
  CompositeAuditLogger,
  defaultAuditLogger,
} from './audit-logger';
