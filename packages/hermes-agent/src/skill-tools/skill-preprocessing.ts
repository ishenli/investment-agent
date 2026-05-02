/**
 * Skill content preprocessing — template substitution and inline shell expansion.
 *
 * Ported from Python hermes-agent's agent/skill_preprocessing.py.
 *
 * Two preprocessing passes:
 *   1. Template vars: replace ${HERMES_SKILL_DIR} and ${HERMES_SESSION_ID}
 *   2. Inline shell:  replace !`cmd` with stdout of cmd execution
 */

import { execSync } from 'node:child_process';
import type { PreprocessingConfig } from './types';

// ============== Template Variable Substitution ==============

const TEMPLATE_VAR_RE = /\$\{(HERMES_SKILL_DIR|HERMES_SESSION_ID)\}/g;

/**
 * Replace template variables in skill content.
 *
 * Supported variables:
 *   ${HERMES_SKILL_DIR}  — absolute path to the skill directory
 *   ${HERMES_SESSION_ID} — current session identifier
 */
export function substituteTemplateVars(
  content: string,
  skillDir: string,
  sessionId?: string,
): string {
  return content.replace(TEMPLATE_VAR_RE, (match, varName: string) => {
    switch (varName) {
      case 'HERMES_SKILL_DIR':
        return skillDir;
      case 'HERMES_SESSION_ID':
        return sessionId ?? 'default';
      default:
        return match;
    }
  });
}

// ============== Inline Shell Expansion ==============

const INLINE_SHELL_RE = /!\`([^`]+)\`/g;
const INLINE_SHELL_MAX_OUTPUT = 4000;

/**
 * Execute a single inline-shell command and return its stdout.
 * Returns error text on failure (does not throw).
 */
function runInlineShell(
  command: string,
  cwd: string,
  timeout: number,
): string {
  try {
    const output = execSync(command, {
      cwd,
      timeout,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: INLINE_SHELL_MAX_OUTPUT * 2,
    });

    const trimmed = output.trim();
    if (trimmed.length > INLINE_SHELL_MAX_OUTPUT) {
      return trimmed.slice(0, INLINE_SHELL_MAX_OUTPUT) + '\n... (output truncated)';
    }
    return trimmed;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `[inline-shell error: ${msg}]`;
  }
}

/**
 * Replace every !`cmd` snippet in content with its stdout.
 */
export function expandInlineShell(
  content: string,
  skillDir: string,
  timeout = 5000,
): string {
  return content.replace(INLINE_SHELL_RE, (_match, command: string) => {
    return runInlineShell(command.trim(), skillDir, timeout);
  });
}

// ============== Main Preprocessing Entry Point ==============

/**
 * Apply all configured preprocessing passes to skill content.
 *
 * @param content   Raw skill prompt from SKILL.md
 * @param skillDir  Absolute path to the skill directory
 * @param sessionId Optional session identifier
 * @param config    Preprocessing feature flags
 * @returns Processed content ready for LLM consumption
 */
export function preprocessSkillContent(
  content: string,
  skillDir: string,
  sessionId?: string,
  config: PreprocessingConfig = {},
): string {
  let result = content;

  // Pass 1: Template variable substitution (default: enabled)
  if (config.templateVars !== false) {
    result = substituteTemplateVars(result, skillDir, sessionId);
  }

  // Pass 2: Inline shell expansion (default: disabled for safety)
  if (config.inlineShell === true) {
    const timeout = config.inlineShellTimeout ?? 5000;
    result = expandInlineShell(result, skillDir, timeout);
  }

  return result;
}
