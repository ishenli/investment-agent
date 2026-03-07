/**
 * Skill Management Types
 *
 * Types for the Skills Management Panel feature.
 * Skills represent AI capabilities that can be enabled/disabled by users.
 *
 * Type hierarchy:
 *   ParsedSkill       — raw data from filesystem SKILL.md (read-only)
 *   SkillPreference   — user preference record persisted in database
 *   ResolvedSkill     — merged runtime skill used by Agent/Chat (consumption side)
 *   SkillResponse     — API response shape (prompt excluded)
 */

import { skills } from '@/drizzle/schema';

// ============== Enums ==============

/**
 * Skill source enum defining where a skill comes from
 * - official: Built-in skills provided by the application
 * - community: Skills shared by the community
 * - custom: User-defined custom skills
 */
export type SkillSource = 'official' | 'community' | 'custom';

/**
 * Common skill categories for type classification
 */
export type SkillCategory =
  | 'brainstorming'
  | 'debugging'
  | 'tdd'
  | 'code-review'
  | 'testing'
  | 'documentation'
  | 'optimization'
  | 'refactoring'
  | 'other';

// ============== Database Types ==============

/**
 * Skill entity type (inferred from database schema)
 * Represents a user preference record for a skill.
 */
export type Skill = typeof skills.$inferSelect;

/**
 * Type for creating a new skill (excludes auto-generated fields)
 */
export type CreateSkillData = Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>;

// ============== Filesystem Types ==============

/**
 * Raw skill data parsed from a SKILL.md file on the filesystem.
 * This is a read-only representation — the file is the source of truth.
 */
export interface ParsedSkill {
  /** Directory name, used as the unique slug / business key */
  id: string;
  name: string;
  description: string;
  /** Full prompt content from SKILL.md (after frontmatter) */
  prompt: string;
  isOfficial: boolean;
  isBuiltIn: boolean;
  /** File last-modified timestamp in milliseconds */
  updatedAt: number;
  /** Absolute path to SKILL.md */
  skillPath: string;
  version?: string;
}

// ============== Resolved (Runtime) Types ==============

/**
 * Fully resolved skill used on the consumption side (Agent/Chat).
 * Merges filesystem data with user preference from the database.
 */
export interface ResolvedSkill extends ParsedSkill {
  /** Database record ID, present only when a preference row exists */
  dbId?: number;
  /** Merged enabled state: DB preference overrides filesystem default */
  isEnabled: boolean;
  source: SkillSource;
  category: SkillCategory;
  icon?: string | null;
}

// ============== Request Types ==============

/**
 * Request type for creating a new custom skill
 */
export interface CreateSkillRequest {
  slug: string;
  name: string;
  description: string;
  category: SkillCategory;
  source?: SkillSource;
  isEnabled?: boolean;
  icon?: string;
  config?: Record<string, unknown>;
  /** Prompt content (required for custom skills that have no SKILL.md) */
  prompt?: string;
}

/**
 * Request type for updating an existing skill
 */
export interface UpdateSkillRequest {
  id: number;
  slug?: string;
  name?: string;
  description?: string;
  category?: SkillCategory;
  isEnabled?: boolean;
  icon?: string;
  config?: Record<string, unknown>;
}

/**
 * Request type for toggling a skill's enabled state
 */
export interface ToggleSkillRequest {
  id: number;
  isEnabled: boolean;
}

/**
 * Request type for installing a skill from an external source
 */
export interface InstallSkillRequest {
  /** GitHub URL, repo path (owner/repo), local path, or zip file path */
  source: string;
  /** Optional: install method hint */
  uploadMethod?: 'github' | 'zip' | 'folder';
  /** GitHub URL when uploadMethod is 'github' */
  githubUrl?: string;
  /** File name when uploadMethod is 'zip' */
  fileName?: string;
  /** File count when uploadMethod is 'folder' */
  fileCount?: number;
}

// ============== Response Types ==============

/**
 * Skill response type for API responses.
 * Omits the prompt field to avoid unintended exposure.
 */
export interface SkillResponse {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: SkillCategory;
  source: SkillSource;
  icon: string | null;
  isEnabled: boolean;
  isOfficial: boolean;
  isBuiltIn: boolean;
  skillPath: string;
  version?: string;
  createdAt: string;
  updatedAt: string;
  /** dbId is present when a database preference record exists */
  dbId?: number;
}

// ============== Search/Filter Types ==============

/**
 * Search parameters for filtering skills
 */
export interface SkillSearchParams {
  search?: string;
  category?: SkillCategory;
  source?: SkillSource;
  limit?: number;
  offset?: number;
}

/**
 * Skill list response with pagination
 */
export interface SkillListResponse {
  skills: SkillResponse[];
  totalCount: number;
}

// ============== Store Types ==============

/**
 * Skills store state
 */
export interface SkillsState {
  skills: SkillResponse[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  selectedCategory: SkillCategory | null;
  selectedSource: SkillSource | null;
  saving: boolean;
}

// ============== UI Helper Types ==============

/**
 * Form mode for skill editing dialogs
 */
export type SkillFormMode = 'create' | 'edit';

/**
 * Skill category display metadata
 */
export interface SkillCategoryDisplay {
  value: SkillCategory;
  label: string;
  icon: string;
}

/**
 * Skill source display metadata
 */
export interface SkillSourceDisplay {
  value: SkillSource;
  label: string;
  badgeVariant: 'default' | 'secondary' | 'outline';
}

// ============== Install Result ==============

export interface InstallResult {
  success: boolean;
  message?: string;
  installedSlugs?: string[];
  error?: string;
}

// ============== Legacy Aliases (kept for backward compatibility) ==============

/**
 * @deprecated Use ParsedSkill instead
 */
export type SkillRecord = ParsedSkill & { id: string };

/**
 * @deprecated Use SkillResponse instead
 */
export interface SkillDefinition {
  name: string;
  description: string;
  prompt: string;
  enabled: boolean;
}
