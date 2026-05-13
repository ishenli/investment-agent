/**
 * Permission System Types for Hermes Agent
 *
 * Defines the type system for centralized permission control.
 */

/**
 * Permission levels define who can execute what.
 * - safe: Most restrictive, only read/write operations
 * - standard: Default, requires confirmation for system/finance operations
 * - power: Advanced, auto for finance, confirm for system
 * - unrestricted: Least restrictive, all operations auto (ContentGuard still applies)
 */
export type PermissionLevel = 'safe' | 'standard' | 'power' | 'unrestricted';

/**
 * Tool categories define the risk level and nature of operations.
 * - read: Read-only queries (low risk)
 * - write: Data modifications (medium risk)
 * - system: System-level operations like terminal, delete (high risk)
 * - finance: Financial operations (business sensitive)
 */
export type ToolCategory = 'read' | 'write' | 'system' | 'finance';

/**
 * Policy outcome for tool execution.
 * - auto: Execute immediately (ContentGuard still applies)
 * - confirm: Require user confirmation before execution
 * - deny: Block execution entirely
 */
export type ToolPolicy = 'auto' | 'confirm' | 'deny';

/**
 * Decision result from ContentGuard validation.
 */
export interface GuardDecision {
  /** Whether the operation is allowed */
  allowed: boolean;
  /** Reason for the decision (especially important for denials) */
  reason?: string;
  /** The matched pattern or rule that triggered this decision */
  pattern?: string;
  /** Policy that was applied */
  policy?: 'permission' | 'content-guard';
}

/**
 * Request for user confirmation when policy is 'confirm'.
 */
export interface ConfirmationRequest {
  /** Tool name being executed */
  toolName: string;
  /** Arguments passed to the tool */
  args: Record<string, unknown>;
  /** Current permission level */
  permissionLevel: PermissionLevel;
  /** Tool's category */
  toolCategory: ToolCategory;
  /** Timestamp of the request */
  timestamp: number;
}

/**
 * Result of confirmation request.
 */
export type ConfirmationResult = 'confirm' | 'decline';

/**
 * Permission policy interface that defines the strategy matrix.
 */
export interface IPermissionPolicy {
  /**
   * Evaluate the policy for a given tool category and permission level.
   * @param category The tool's category
   * @param level The current permission level
   * @returns The policy outcome (auto/confirm/deny)
   */
  evaluate(category: ToolCategory, level: PermissionLevel): ToolPolicy;
}

/**
 * Audit log entry for permission decisions.
 */
export interface AuditLogEntry {
  /** Timestamp of the decision */
  timestamp: number;
  /** Tool name */
  toolName: string;
  /** Tool category */
  toolCategory: ToolCategory;
  /** Current permission level */
  permissionLevel: PermissionLevel;
  /** Policy outcome */
  policy: ToolPolicy;
  /** Final decision */
  decision: 'allowed' | 'denied';
  /** Reason for denial (if applicable) */
  reason?: string;
  /** ContentGuard matched pattern (if applicable) */
  contentGuardPattern?: string;
  /** Whether user confirmation was requested */
  confirmationRequested?: boolean;
  /** User's confirmation response (if applicable) */
  confirmationResult?: ConfirmationResult;
}
