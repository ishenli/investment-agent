/**
 * Permission System - Public API
 *
 * Exports all types and implementations for the centralized permission system.
 */

export type {
  PermissionLevel,
  ToolCategory,
  ToolPolicy,
  GuardDecision,
  ConfirmationRequest,
  ConfirmationResult,
  IPermissionPolicy,
  AuditLogEntry,
} from './types';

export {
  PermissionPolicy,
  defaultPermissionPolicy,
  isToolAllowed,
  requiresConfirmation,
} from './policy';
