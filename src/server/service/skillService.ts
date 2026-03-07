/**
 * Skill Service
 *
 * Business logic layer: orchestrates the production and consumption of skills.
 *
 * Production side  — create, update, delete, install, sync
 * Consumption side — query (merged filesystem + DB), toggle, getEnabledSkills
 *
 * All filesystem I/O is delegated to SkillInstaller / SkillFileScanner.
 * All state merging is handled by SkillRegistry.
 * This class is purely an orchestration / façade layer.
 */

import logger from '@server/base/logger';
import { skillRepository, type CreateSkillData, type UpdateSkillData } from '../repository/skillRepository';
import { skillRegistry } from '../lib/skill/SkillRegistry';
import { skillInstaller } from '../lib/skill/SkillInstaller';
import type {
  Skill,
  CreateSkillRequest,
  UpdateSkillRequest,
  ToggleSkillRequest,
  SkillSearchParams,
  SkillListResponse,
  InstallSkillRequest,
  InstallResult,
  ResolvedSkill,
} from '@typings/skill';

export class SkillService {
  // ─────────────────────────────────────────────────────────────────────────
  // Consumption side
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get the skill list for the management UI.
   * Merges filesystem skills with the user's DB preference records.
   * Supports search, category, source filtering and pagination.
   */
  async getSkills(userId: number, params: SkillSearchParams = {}): Promise<SkillListResponse> {
    try {
      return await skillRegistry.getSkills(userId, params);
    } catch (error) {
      logger.error('[SkillService] Failed to get skills:', error);
      throw new Error('Failed to get skills');
    }
  }

  /**
   * Get a single skill by its database ID.
   * Returns the raw DB entity (used by the single-skill detail endpoint).
   */
  async getSkill(userId: number, skillId: number): Promise<Skill | null> {
    try {
      const skill = await skillRepository.findByUserIdAndId(userId, skillId);
      return skill ?? null;
    } catch (error) {
      logger.error('[SkillService] Failed to get skill:', error);
      throw new Error('Failed to get skill');
    }
  }

  /**
   * Get enabled skills — for the Agent/Chat runtime consumption path.
   * Returns ResolvedSkill[] which includes the prompt field for LLM injection.
   */
  async getEnabledSkills(userId: number): Promise<ResolvedSkill[]> {
    try {
      return await skillRegistry.getEnabledSkills(userId);
    } catch (error) {
      logger.error('[SkillService] Failed to get enabled skills:', error);
      throw new Error('Failed to get enabled skills');
    }
  }

  /**
   * Toggle a skill's enabled/disabled state.
   * Accepts either an id (DB-based) or the newer slug-based approach.
   * Uses slug as the canonical business key; falls back to id lookup if slug not supplied.
   */
  async toggleSkill(userId: number, data: ToggleSkillRequest): Promise<Skill> {
    try {
      // Find the skill to get its slug
      const existing = await skillRepository.findByUserIdAndId(userId, data.id);
      if (!existing) {
        throw new Error('Skill not found');
      }

      // Delegate state update to registry (upserts DB preference + invalidates cache)
      await skillRegistry.toggle(userId, existing.slug, data.isEnabled);

      // Return updated DB entity
      const updated = await skillRepository.findByUserIdAndId(userId, data.id);
      return updated!;
    } catch (error) {
      logger.error('[SkillService] Failed to toggle skill:', error);
      throw error instanceof Error ? error : new Error('Failed to toggle skill');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Production side — custom skill CRUD
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Create a custom skill (persisted only in the DB, no SKILL.md on disk).
   */
  async createSkill(userId: number, data: CreateSkillRequest): Promise<Skill> {
    try {
      const slugExists = await skillRepository.isSlugExists(userId, data.slug);
      if (slugExists) {
        throw new Error('Skill slug already exists');
      }

      const skillData: CreateSkillData = {
        slug: data.slug,
        name: data.name,
        description: data.description,
        category: data.category,
        source: data.source ?? 'custom',
        isEnabled: data.isEnabled !== undefined ? data.isEnabled : true,
        icon: data.icon,
        config: data.prompt
          ? { ...(data.config ?? {}), prompt: data.prompt }
          : (data.config ?? null),
        userId,
      };

      const skill = await skillRepository.create(skillData);
      skillRegistry.invalidate(userId);
      return skill;
    } catch (error) {
      logger.error('[SkillService] Failed to create skill:', error);
      throw error instanceof Error ? error : new Error('Failed to create skill');
    }
  }

  /**
   * Update an existing custom skill.
   */
  async updateSkill(userId: number, skillId: number, data: UpdateSkillRequest): Promise<Skill> {
    try {
      const existingSkill = await skillRepository.findByUserIdAndId(userId, skillId);
      if (!existingSkill) {
        throw new Error('Skill not found');
      }

      if (data.slug && data.slug !== existingSkill.slug) {
        const slugExists = await skillRepository.isSlugExists(userId, data.slug, skillId);
        if (slugExists) {
          throw new Error('Skill slug already exists');
        }
      }

      const updateData: UpdateSkillData = {
        slug: data.slug,
        name: data.name,
        description: data.description,
        category: data.category,
        isEnabled: data.isEnabled,
        icon: data.icon,
        config: data.config,
      };

      const skill = await skillRepository.update(userId, skillId, updateData);
      if (!skill) {
        throw new Error('Failed to update skill');
      }

      skillRegistry.invalidate(userId);
      return skill;
    } catch (error) {
      logger.error('[SkillService] Failed to update skill:', error);
      throw error instanceof Error ? error : new Error('Failed to update skill');
    }
  }

  /**
   * Delete a custom skill.
   * Official skills cannot be deleted (only toggled off).
   */
  async deleteSkill(userId: number, skillId: number): Promise<boolean> {
    try {
      const skill = await skillRepository.findByUserIdAndId(userId, skillId);
      if (!skill) {
        throw new Error('Skill not found');
      }
      if (skill.source === 'official') {
        throw new Error('Cannot delete official skills');
      }

      const result = await skillRepository.delete(userId, skillId);
      skillRegistry.invalidate(userId);
      return result;
    } catch (error) {
      logger.error('[SkillService] Failed to delete skill:', error);
      throw error instanceof Error ? error : new Error('Failed to delete skill');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Production side — install from external sources
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Install skill(s) from an external source (GitHub, ZIP, local dir).
   * Delegates file operations to SkillInstaller, then invalidates the registry cache.
   */
  async installSkill(userId: number, request: InstallSkillRequest): Promise<InstallResult> {
    try {
      // Resolve the actual source string from the request
      let source = request.source;
      if (request.uploadMethod === 'github' && request.githubUrl) {
        source = request.githubUrl;
      }
      // ZIP and folder installs: the actual file has already been uploaded to a temp
      // location by the time this is called; `source` carries that path.

      const result = await skillInstaller.install(source);

      if (result.success) {
        // Invalidate registry cache so the new skills appear on next query
        skillRegistry.invalidate(userId);
        logger.info(
          `[SkillService] Installed ${result.installedSlugs?.length ?? 0} skill(s) for user ${userId}:`,
          result.installedSlugs,
        );
      } else {
        logger.warn(`[SkillService] Skill install failed: ${result.error}`);
      }

      return result;
    } catch (error) {
      logger.error('[SkillService] Failed to install skill:', error);
      throw error instanceof Error ? error : new Error('Failed to install skill');
    }
  }

  /**
   * @deprecated Use installSkill() instead.
   * Kept for backward-compatibility with existing controller references.
   */
  async downloadSkill(userId: number, source: string): Promise<InstallResult> {
    return this.installSkill(userId, { source });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Production side — built-in skill sync
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Sync built-in (filesystem / bundled) skills into the user's DB preference table.
   *
   * This method is the single entry point for keeping the DB metadata table in sync
   * with the SKILL.md files on disk. It performs a three-way reconciliation:
   *
   *   1. CREATE — skills present on FS but missing from DB get a new DB row.
   *   2. UPDATE — skills whose name / description / version have drifted in the FS
   *               get their DB metadata refreshed (user's isEnabled state is preserved).
   *   3. PRUNE  — DB rows whose slug no longer matches any file-based official/builtin
   *               skill are deleted (prevents stale entries in the management UI).
   *
   * Custom skills (source = 'custom') stored only in DB are never touched.
   * The operation is idempotent — safe to call multiple times or on every startup.
   *
   * Returns a summary object with counts for each reconciliation action.
   */
  async syncBuiltinSkills(userId: number): Promise<{ created: number; updated: number; pruned: number }> {
    try {
      const { skillFileScanner } = await import('../lib/skill/SkillFileScanner');
      const parsedSkills = skillFileScanner.scan();

      // Build a set of slugs that are currently on the filesystem and are official/builtin
      const fsOfficialSlugs = new Set(
        parsedSkills
          .filter((p) => p.isBuiltIn || p.isOfficial)
          .map((p) => p.id),
      );

      let created = 0;
      let updated = 0;

      // ── Pass 1: create / update DB rows for every FS official skill ──────────
      for (const parsed of parsedSkills) {
        if (!parsed.isBuiltIn && !parsed.isOfficial) continue;

        const existing = await skillRepository.findByUserIdAndSlug(userId, parsed.id);

        if (!existing) {
          // Skill exists on FS but not in DB → create
          await skillRepository.create({
            slug: parsed.id,
            name: parsed.name,
            description: parsed.description,
            category: 'other',
            source: 'official',
            isEnabled: true,
            userId,
          });
          created++;
          logger.debug(`[SkillService] syncBuiltinSkills: created "${parsed.id}"`);
        } else {
          // Skill exists in both places → refresh metadata if it has drifted
          const nameChanged = existing.name !== parsed.name;
          const descChanged = existing.description !== parsed.description;
          const versionChanged =
            parsed.version !== undefined &&
            (existing.config as Record<string, unknown> | null)?.version !== parsed.version;

          if (nameChanged || descChanged || versionChanged) {
            const updatePayload: Record<string, unknown> = {};
            if (nameChanged) updatePayload.name = parsed.name;
            if (descChanged) updatePayload.description = parsed.description;
            if (versionChanged) {
              updatePayload.config = {
                ...((existing.config as Record<string, unknown> | null) ?? {}),
                version: parsed.version,
              };
            }

            await skillRepository.update(userId, existing.id, updatePayload);
            updated++;
            logger.debug(`[SkillService] syncBuiltinSkills: updated metadata for "${parsed.id}"`);
          }
        }
      }

      // ── Pass 2: prune DB rows for official skills no longer on the filesystem ─
      const dbOfficialSkills = (await skillRepository.findByUserId(userId)).filter(
        (s) => s.source === 'official',
      );

      let pruned = 0;
      for (const dbSkill of dbOfficialSkills) {
        if (!fsOfficialSlugs.has(dbSkill.slug)) {
          await skillRepository.delete(userId, dbSkill.id);
          pruned++;
          logger.debug(`[SkillService] syncBuiltinSkills: pruned stale DB row for "${dbSkill.slug}"`);
        }
      }

      skillRegistry.invalidate(userId);
      logger.info(
        `[SkillService] syncBuiltinSkills for user ${userId}: ` +
          `created=${created}, updated=${updated}, pruned=${pruned}`,
      );
      return { created, updated, pruned };
    } catch (error) {
      logger.error('[SkillService] Failed to sync builtin skills:', error);
      throw new Error('Failed to sync builtin skills');
    }
  }
}

export const skillService = new SkillService();
