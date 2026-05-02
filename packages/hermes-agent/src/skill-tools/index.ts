/**
 * Skill tools — barrel exports.
 *
 * Provides tools for skill discovery, viewing, and self-iteration (自迭代).
 *
 * Three-tier progressive disclosure:
 *   Tier 1 (skills_list): Metadata index (~100 tokens/skill)
 *   Tier 2 (skill_view):  Full prompt + supporting file list
 *   Tier 3 (skill_view):  Individual supporting file content
 *
 * Self-iteration via skill_manage:
 *   - create: Capture successful workflows as new skills
 *   - edit:   Full rewrite when the approach fundamentally changes
 *   - patch:  Incremental improvement with fuzzy matching
 *   - delete: Remove obsolete skills
 *   - write_file/remove_file: Manage supporting resources
 */

// Registration
export { registerSkillTools, type SkillToolsConfig } from './register';

// Individual tools (for custom registration)
export { skillsListSchema, createSkillsListHandler } from './skills-list';
export { skillViewSchema, createSkillViewHandler } from './skill-view';
export { skillManageSchema, createSkillManageHandler } from './skill-manage';

// Preprocessing
export {
  preprocessSkillContent,
  substituteTemplateVars,
  expandInlineShell,
} from './skill-preprocessing';

// Utilities
export {
  parseFrontmatter,
  buildSkillMarkdown,
  skillMatchesPlatform,
  scanSkills,
  findSkillDir,
  parseSkillMetadata,
  parseSkillContent,
  listSkillDirs,
  listSupportingFiles,
} from './skill-utils';

// Types
export type {
  SkillMetadata,
  SkillContent,
  SkillManageAction,
  SkillManageResult,
  SkillFrontmatter,
  SkillScanOptions,
  PreprocessingConfig,
} from './types';

export {
  SKILL_FILE_NAME,
  ALLOWED_SUBDIRS,
  MAX_NAME_LENGTH,
  MAX_SKILL_CONTENT_CHARS,
  MAX_SKILL_FILE_BYTES,
  VALID_NAME_RE,
  PLATFORM_MAP,
} from './types';
