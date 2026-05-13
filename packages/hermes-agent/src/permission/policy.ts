/**
 * Permission Policy Implementation
 *
 * Implements the permission policy matrix that maps (PermissionLevel, ToolCategory) to ToolPolicy.
 */

import type { PermissionLevel, ToolCategory, ToolPolicy, IPermissionPolicy } from './types';

/**
 * The permission policy matrix.
 * Rows: PermissionLevel (safe, standard, power, unrestricted)
 * Columns: ToolCategory (read, write, system, finance)
 * Values: ToolPolicy (auto, confirm, deny)
 */
const POLICY_MATRIX: Record<PermissionLevel, Record<ToolCategory, ToolPolicy>> = {
  safe: {
    read: 'auto',
    write: 'auto',
    system: 'deny',
    finance: 'deny',
  },
  standard: {
    read: 'auto',
    write: 'auto',
    system: 'confirm',
    finance: 'confirm',
  },
  power: {
    read: 'auto',
    write: 'auto',
    system: 'confirm',
    finance: 'auto',
  },
  unrestricted: {
    read: 'auto',
    write: 'auto',
    system: 'auto',
    finance: 'auto',
  },
};

/**
 * Default permission policy implementation.
 * Uses the standard 4x4 policy matrix.
 */
export class PermissionPolicy implements IPermissionPolicy {
  /**
   * Evaluate the policy for a given tool category and permission level.
   * @param category The tool's category
   * @param level The current permission level
   * @returns The policy outcome (auto/confirm/deny)
   */
  evaluate(category: ToolCategory, level: PermissionLevel): ToolPolicy {
    return POLICY_MATRIX[level][category];
  }

  /**
   * Get all policies for a given permission level.
   * Useful for debugging or auditing.
   */
  getPoliciesForLevel(level: PermissionLevel): Record<ToolCategory, ToolPolicy> {
    return { ...POLICY_MATRIX[level] };
  }

  /**
   * Get the entire policy matrix.
   * Useful for documentation or inspection.
   */
  getFullMatrix(): Record<PermissionLevel, Record<ToolCategory, ToolPolicy>> {
    return JSON.parse(JSON.stringify(POLICY_MATRIX));
  }
}

/**
 * Default instance of PermissionPolicy.
 */
export const defaultPermissionPolicy = new PermissionPolicy();

/**
 * Helper function to check if a tool is allowed at a given level.
 * @param category Tool category
 * @param level Permission level
 * @param policy Policy instance (defaults to defaultPermissionPolicy)
 * @returns true if the policy is 'auto' or 'confirm', false if 'deny'
 */
export function isToolAllowed(
  category: ToolCategory,
  level: PermissionLevel,
  policy: IPermissionPolicy = defaultPermissionPolicy
): boolean {
  const result = policy.evaluate(category, level);
  return result !== 'deny';
}

/**
 * Helper function to check if a tool requires confirmation.
 * @param category Tool category
 * @param level Permission level
 * @param policy Policy instance (defaults to defaultPermissionPolicy)
 * @returns true if the policy is 'confirm'
 */
export function requiresConfirmation(
  category: ToolCategory,
  level: PermissionLevel,
  policy: IPermissionPolicy = defaultPermissionPolicy
): boolean {
  return policy.evaluate(category, level) === 'confirm';
}
