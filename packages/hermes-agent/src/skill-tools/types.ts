/**
 * Skill tool types for hermes-agent.
 *
 * Defines the interfaces used by skills_list, skill_view, and skill_manage tools.
 */

// ============== Skill Metadata (Tier 1 — lightweight) ==============

export interface SkillMetadata {
  /** Filesystem-safe slug (directory name) */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Short description */
  description: string;
  /** Category or directory grouping */
  category?: string;
  /** Version from frontmatter */
  version?: string;
  /** Whether this is an official/bundled skill */
  isOfficial: boolean;
  /** Platform restrictions */
  platforms?: string[];
}

// ============== Skill Content (Tier 2 — full prompt) ==============

export interface SkillContent extends SkillMetadata {
  /** Full prompt content from SKILL.md (after frontmatter) */
  prompt: string;
  /** Absolute path to the skill directory */
  skillDir: string;
  /** Absolute path to SKILL.md */
  skillPath: string;
  /** Supporting files found in the skill directory */
  supportingFiles: string[];
  /** Raw frontmatter fields */
  frontmatter: Record<string, unknown>;
}

// ============== Skill Manage Actions ==============

export type SkillManageAction =
  | 'create'
  | 'edit'
  | 'patch'
  | 'delete'
  | 'write_file'
  | 'remove_file';

// ============== Frontmatter ==============

export interface SkillFrontmatter {
  name: string;
  description: string;
  version?: string;
  official?: boolean;
  platforms?: string[];
  [key: string]: unknown;
}

// ============== Skill Scanning ==============

export interface SkillScanOptions {
  /** Only include skills matching this category */
  category?: string;
  /** Skip platform-incompatible skills */
  filterPlatform?: boolean;
}

// ============== Skill Manage Result ==============

export interface SkillManageResult {
  success: boolean;
  message: string;
  skillName?: string;
  filePath?: string;
}

// ============== Preprocessing Config ==============

export interface PreprocessingConfig {
  /** Enable template variable substitution (default: true) */
  templateVars?: boolean;
  /** Enable inline shell expansion (default: false) */
  inlineShell?: boolean;
  /** Timeout for inline shell commands in ms (default: 5000) */
  inlineShellTimeout?: number;
}

// ============== Constants ==============

export const SKILL_FILE_NAME = 'SKILL.md';
export const ALLOWED_SUBDIRS = new Set(['references', 'templates', 'scripts', 'assets']);
export const MAX_NAME_LENGTH = 64;
export const MAX_SKILL_CONTENT_CHARS = 100_000;
export const MAX_SKILL_FILE_BYTES = 1_048_576; // 1 MiB
export const VALID_NAME_RE = /^[a-z0-9][a-z0-9._-]*$/;

export const PLATFORM_MAP: Record<string, string> = {
  macos: 'darwin',
  linux: 'linux',
  windows: 'win32',
};
