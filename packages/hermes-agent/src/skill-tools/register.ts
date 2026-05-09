/**
 * Register all skill tools with a ToolRegistry.
 *
 * Usage:
 *   const registry = ToolRegistry.create();
 *   registerSkillTools(registry, {
 *     skillRoots: ['./skills', '~/.hermes/skills'],
 *     localSkillsDir: '~/.hermes/skills',
 *   });
 */

import type { ToolRegistry } from '../tools';
import { skillsListSchema, createSkillsListHandler } from './skills-list';
import { skillViewSchema, createSkillViewHandler } from './skill-view';
import { skillManageSchema, createSkillManageHandler } from './skill-manage';
import type { PreprocessingConfig } from './types';

export interface SkillToolsConfig {
  /**
   * Ordered list of skill root directories to scan.
   * Skills from later roots override earlier ones (higher priority).
   */
  skillRoots: string[];

  /**
   * Writable skills directory for create/edit/patch/delete operations.
   * Only skills inside this directory can be modified.
   * Typically: '~/.hermes/skills' or project-local 'skills/' directory.
   */
  localSkillsDir: string;

  /**
   * Preprocessing configuration for skill content.
   */
  preprocessing?: PreprocessingConfig;

  /**
   * Session identifier for template variable substitution.
   */
  sessionId?: string;

  /**
   * Which skill tools to enable (default: all).
   */
  enable?: ('skills_list' | 'skill_view' | 'skill_manage')[];

  /**
   * If provided, only skills whose slug is in this set are discoverable / viewable.
   * Used to respect UI-level skill enablement toggles.
   */
  enabledSlugs?: string[];

  /**
   * Optional callback invoked after a successful skill_manage mutation.
   * Allows the caller (e.g., server-side service layer) to sync DB state
   * and trigger deployment.
   */
  onSkillChanged?: (event: { action: 'create' | 'edit' | 'patch' | 'delete' | 'write_file' | 'remove_file'; slug: string }) => void | Promise<void>;
}

/**
 * Register skill tools with a ToolRegistry.
 *
 * Registers up to 3 tools:
 *   - skills_list: List available skills (metadata only)
 *   - skill_view: Load full skill content or supporting files
 *   - skill_manage: Create/edit/patch/delete skills (self-iteration)
 */
export function registerSkillTools(
  registry: ToolRegistry,
  config: SkillToolsConfig,
): void {
  const enabled = config.enable
    ? new Set(config.enable)
    : new Set(['skills_list', 'skill_view', 'skill_manage']);

  if (enabled.has('skills_list')) {
    registry.register(
      'skills_list',
      'List all available skills with name, description, and category. ' +
        'Use this first to discover skills, then skill_view to load full instructions.',
      skillsListSchema,
      createSkillsListHandler(config.skillRoots, config.enabledSlugs),
    );
  }

  if (enabled.has('skill_view')) {
    registry.register(
      'skill_view',
      'Load a skill\'s full prompt and instructions, or a specific supporting file. ' +
        'Call with name only to get the full skill. ' +
        'Call with name + file_path to load a supporting resource.',
      skillViewSchema,
      createSkillViewHandler(config.skillRoots, {
        preprocessing: config.preprocessing,
        sessionId: config.sessionId,
        enabledSlugs: config.enabledSlugs,
      }),
    );
  }

  if (enabled.has('skill_manage')) {
    registry.register(
      'skill_manage',
      'Create, edit, patch, or delete skills. Also manage supporting files. ' +
        'Supports fuzzy matching for patches. Only local skills can be modified. ' +
        'Actions: create, edit, patch, delete, write_file, remove_file.',
      skillManageSchema,
      createSkillManageHandler(config.localSkillsDir, config.skillRoots, config.onSkillChanged),
    );
  }
}
