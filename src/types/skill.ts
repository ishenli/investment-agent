/**
 * Skill Management Types
 *
 * Types for the Skills Management Panel feature.
 * Skills represent AI capabilities that can be enabled/disabled by users.
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
 */
export type Skill = typeof skills.$inferSelect;

/**
 * Type for creating a new skill (excludes auto-generated fields)
 */
export type CreateSkillData = Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>;

// ============== Request Types ==============

/**
 * Request type for creating a new skill
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

// ============== Response Types ==============

/**
 * Skill response type (for API responses)
 */
export interface SkillResponse {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: SkillCategory;
  source: SkillSource;
  isEnabled: boolean;
  icon: string | null;
  config: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
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
  items: SkillResponse[];
  totalCount: number;
}

// ============== Store Types ==============

/**
 * Skills store state
 */
export interface SkillsState {
  skills: Skill[];
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