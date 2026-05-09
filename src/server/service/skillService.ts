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
 *
 * Note: Database only stores user preferences (slug, source, isEnabled, icon).
 * Content fields (name, description, category, prompt) come from SKILL.md files.
 */

import logger from '@server/base/logger';
import { skillRepository, type CreateSkillData, type UpdateSkillData, type SkillEntity } from '../repository/skillRepository';
import { skillRegistry } from '../lib/skill/SkillRegistry';
import { skillInstaller } from '../lib/skill/SkillInstaller';
import { validateSkill } from '../lib/skill/skillContentValidator';
import { skillFileScanner, SKILL_FILE_NAME } from '../lib/skill/SkillFileScanner';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import crypto from 'crypto';
import { claudeService } from './claudeService';
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
import { isNull } from 'drizzle-orm';
import { db } from '../lib/db';
import { users } from '@/drizzle/schema';

export class SkillService {
  // ─────────────────────────────────────────────────────────────────────────
  // Consumption side
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get the skill list for the management UI.
   * Merges filesystem skills with the user's DB preference records.
   * Supports search, source filtering and pagination.
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
   * Get a single skill by slug.
   * Returns the resolved skill (merged from filesystem + DB).
   */
  async getSkill(userId: number, slug: string): Promise<ResolvedSkill | null> {
    try {
      return await skillRegistry.getBySlug(userId, slug);
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
   * Get resolved skills by an explicit list of slugs, ignoring global isEnabled state.
   * Used for session-level skill activation: the user picked these slugs explicitly in
   * the tool panel, so we must load them even if they are globally disabled.
   */
  async getSkillsBySlugs(userId: number, slugs: string[]): Promise<ResolvedSkill[]> {
    try {
      return await skillRegistry.getSkillsBySlugs(userId, slugs);
    } catch (error) {
      logger.error('[SkillService] Failed to get skills by slugs:', error);
      throw new Error('Failed to get skills by slugs');
    }
  }

  /**
   * Toggle a skill's enabled/disabled state by slug.
   */
  async toggleSkill(userId: number, data: ToggleSkillRequest): Promise<Skill> {
    try {
      // Delegate state update to registry (upserts DB preference + invalidates cache)
      await skillRegistry.toggle(userId, data.slug, data.isEnabled);

      // Return updated DB entity
      const updated = await skillRepository.findByUserIdAndSlug(userId, data.slug);
      if (!updated) {
        throw new Error('Failed to toggle skill');
      }

      // 状态变更后重新部署技能文件
      await this.syncDeployment(userId);

      return updated;
    } catch (error) {
      logger.error('[SkillService] Failed to toggle skill:', error);
      throw error instanceof Error ? error : new Error('Failed to toggle skill');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Production side — custom skill CRUD
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Create a custom skill.
   * Creates a SKILL.md file on disk and a DB preference record.
   */
  async createSkill(userId: number, data: CreateSkillRequest): Promise<Skill> {
    try {
      const slugExists = await skillRepository.isSlugExists(userId, data.slug);
      if (slugExists) {
        throw new Error('Skill slug already exists');
      }

      // Build SKILL.md content
      const skillContent = this.buildSkillMarkdown(data);

      // Validate content (warn-only by default; blocks when SKILL_VALIDATION_BLOCK=true)
      validateSkill(data.slug, skillContent);

      // Write SKILL.md file
      skillInstaller.createCustomSkill(data.slug, skillContent, userId);

      // Create DB preference record
      const skillData: CreateSkillData = {
        slug: data.slug,
        source: 'custom',
        isEnabled: data.isEnabled !== undefined ? data.isEnabled : true,
        icon: data.icon ?? null,
        userId,
      };

      const skill = await skillRepository.create(skillData);
      skillRegistry.invalidate(userId);

      // 技能建立后重新部署
      await this.syncDeployment(userId);

      return skill;
    } catch (error) {
      logger.error('[SkillService] Failed to create skill:', error);
      throw error instanceof Error ? error : new Error('Failed to create skill');
    }
  }

  /**
   * Update an existing custom skill.
   * For custom skills: updates SKILL.md content.
   * For all skills: updates DB preference (isEnabled, icon).
   */
  async updateSkill(userId: number, slug: string, data: UpdateSkillRequest): Promise<Skill> {
    try {
      const existingSkill = await skillRepository.findByUserIdAndSlug(userId, slug);
      if (!existingSkill) {
        throw new Error('Skill not found');
      }

      // Update filesystem for custom skills
      if (existingSkill.source === 'custom') {
        if (data.name || data.description || data.prompt) {
          try {
            skillInstaller.updateCustomSkillFiles(slug, {
              name: data.name,
              description: data.description,
              prompt: data.prompt,
            }, userId);
          } catch (error) {
            logger.warn('[SkillService] Failed to update SKILL.md:', error);
            // Continue to update DB preference even if file update fails
          }

          // Validate updated content (warn-only by default)
          try {
            const userRoot = skillFileScanner.getUserSkillsRoot(userId);
            const updatedPath = path.join(userRoot, slug, SKILL_FILE_NAME);
            const updatedContent = await fs.readFile(updatedPath, 'utf-8');
            validateSkill(slug, updatedContent);
          } catch {
            // Skip validation if file read failed
          }
        }
      }

      // Update DB preference
      const updateData: UpdateSkillData = {
        isEnabled: data.isEnabled,
        icon: data.icon,
      };

      const skill = await skillRepository.updateBySlug(userId, slug, updateData);
      if (!skill) {
        throw new Error('Failed to update skill');
      }

      skillRegistry.invalidate(userId);

      // 技能更新后重新部署
      await this.syncDeployment(userId);

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
  async deleteSkill(userId: number, slug: string): Promise<boolean> {
    try {
      const skill = await skillRepository.findByUserIdAndSlug(userId, slug);
      if (!skill) {
        throw new Error('Skill not found');
      }
      if (skill.source === 'official') {
        throw new Error('Cannot delete official skills');
      }

      // Delete SKILL.md files for custom skills
      if (skill.source === 'custom') {
        try {
          skillInstaller.deleteCustomSkillFiles(slug, userId);
        } catch (error) {
          logger.warn('[SkillService] Failed to delete SKILL.md:', error);
          // Continue to delete DB record even if file deletion fails
        }
      }

      const result = await skillRepository.deleteBySlug(userId, slug);
      skillRegistry.invalidate(userId);

      // 技能删除后重新部署（会自动清理该技能的 .md 文件）
      await this.syncDeployment(userId);

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

      const result = await skillInstaller.install(source, userId);

      if (result.success) {
        // Invalidate registry cache so the new skills appear on next query
        skillRegistry.invalidate(userId);
        logger.info(
          `[SkillService] Installed ${result.installedSlugs?.length ?? 0} skill(s) for user ${userId}:`,
          result.installedSlugs,
        );

        // 安装成功后部署新技能
        await this.syncDeployment(userId);
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
   * This method creates DB preference records for skills found on the filesystem
   * that don't yet have a preference entry. It also prunes stale DB entries
   * for skills no longer on the filesystem.
   *
   * Custom skills are never touched by this sync.
   *
   * Returns a summary object with counts for each action.
   */
  async syncBuiltinSkills(userId: number): Promise<{ created: number; pruned: number }> {
    try {
      const { skillFileScanner } = await import('../lib/skill/SkillFileScanner');
      const parsedSkills = skillFileScanner.scanForUser(userId);

      // Build a set of slugs that are currently on the filesystem
      const fsSlugs = new Set(parsedSkills.map((p) => p.id));

      let created = 0;

      // Create DB preference records for skills without one
      for (const parsed of parsedSkills) {
        const existing = await skillRepository.findByUserIdAndSlug(userId, parsed.id);

        if (!existing) {
          await skillRepository.create({
            slug: parsed.id,
            source: parsed.isOfficial || parsed.isBuiltIn ? 'official' : 'custom',
            isEnabled: true,
            userId,
          });
          created++;
          logger.debug(`[SkillService] syncBuiltinSkills: created preference for "${parsed.id}"`);
        }
      }

      // Prune DB rows for official skills no longer on the filesystem
      const dbSkills = await skillRepository.findByUserId(userId);
      let pruned = 0;

      for (const dbSkill of dbSkills) {
        // Only prune official skills that are no longer on filesystem
        if (dbSkill.source === 'official' && !fsSlugs.has(dbSkill.slug)) {
          await skillRepository.delete(userId, dbSkill.id);
          pruned++;
          logger.debug(`[SkillService] syncBuiltinSkills: pruned stale DB row for "${dbSkill.slug}"`);
        }
      }

      skillRegistry.invalidate(userId);
      logger.info(
        `[SkillService] syncBuiltinSkills for user ${userId}: created=${created}, pruned=${pruned}`,
      );

      // 同步完成后部署已启用技能
      await this.syncDeployment(userId);

      return { created, pruned };
    } catch (error) {
      logger.error('[SkillService] Failed to sync builtin skills:', error);
      throw new Error('Failed to sync builtin skills');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Initialization — server startup
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Sync built-in skills for all registered (non-deleted) users.
   * Intended to be called once at server startup (instrumentation).
   * Does NOT block the startup process — caller should fire-and-forget if needed.
   */
  async initForAllUsers(): Promise<void> {
    // Step 1: Electron 环境下将 bundled skills 同步到用户数据目录（文件系统层）
    try {
      const { getSkillManager } = await import('../lib/skillManager');
      getSkillManager().syncBundledSkillsToUserData();
      logger.info('[SkillService] initForAllUsers: syncBundledSkillsToUserData done');
    } catch (error) {
      logger.error('[SkillService] initForAllUsers: syncBundledSkillsToUserData failed:', error);
    }

    const allUsers = await db.query.users.findMany({
      where: isNull(users.deletedAt),
      columns: { id: true },
    });

    if (allUsers.length === 0) {
      logger.info('[SkillService] initForAllUsers: no users found, skipping builtin skills sync');
      return;
    }

    logger.info(`[SkillService] initForAllUsers: syncing builtin skills for ${allUsers.length} user(s)...`);

    for (const user of allUsers) {
      try {
        // Migrate any global custom skills into per-user isolation (one-time)
        const migrated = skillInstaller.migrateGlobalCustomSkills(user.id);
        if (migrated.length > 0) {
          logger.info(`[SkillService] initForAllUsers: migrated ${migrated.length} skill(s) for user ${user.id}:`, migrated);
        }

        const result = await this.syncBuiltinSkills(user.id);
        logger.info(
          `[SkillService] initForAllUsers: skills synced for user ${user.id}: ` +
            `created=${result.created}, pruned=${result.pruned}`,
        );
      } catch (err) {
        logger.warn(`[SkillService] initForAllUsers: skills sync failed for user ${user.id}:`, err);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  // ── Incremental deployment ─────────────────────────────────────────────────

  /**
   * Trigger incremental deployment of enabled skills.
   * Computes content hashes and only copies skills that changed since last deployment.
   * Falls back to full rebuild if FORCE_FULL_DEPLOY env var is set.
   */
  async syncDeployment(userId: number): Promise<void> {
    if (process.env.FORCE_FULL_DEPLOY === 'true') {
      return this._fullDeployFallback(userId);
    }

    try {
      const enabledSkills = await skillRegistry.getEnabledSkills(userId);
      const skillsDir = path.join(claudeService.getUserWorkspaceRoot(userId), '.claude', 'skills');

      // Build current enabled skill map
      const enabledMap = new Map(enabledSkills.map((s) => [s.id, s]));

      // 1. Delete skills that are no longer enabled
      try {
        const entries = await fs.readdir(skillsDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && !enabledMap.has(entry.name)) {
            await fs.rm(path.join(skillsDir, entry.name), { recursive: true, force: true });
            logger.debug(`[SkillService] Removed stale skill dir: ${entry.name}`);
          }
        }
      } catch {
        // skillsDir may not exist yet
      }

      // 2. Ensure skillsDir exists
      await fs.mkdir(skillsDir, { recursive: true });

      // 3. Copy only changed or new skills
      let copied = 0;
      let skipped = 0;
      for (const skill of enabledSkills) {
        if (!skill.skillPath) continue;
        const sourceDir = path.dirname(skill.skillPath);
        const destSkillDir = path.join(skillsDir, skill.id);

        // Compute current content hash
        const content = await fs.readFile(skill.skillPath, 'utf-8');
        const currentHash = crypto.createHash('sha256').update(content).digest('hex');

        // Update contentHash in DB
        await skillRepository.updateContentHash(userId, skill.id, currentHash);

        // Check deployedHash to decide if copy is needed
        const dbSkill = await skillRepository.findByUserIdAndSlug(userId, skill.id);
        if (dbSkill?.deployedHash === currentHash && fsSync.existsSync(path.join(destSkillDir, 'SKILL.md'))) {
          skipped++;
          continue;
        }

        // Remove old dest dir to ensure clean state, then copy
        await fs.rm(destSkillDir, { recursive: true, force: true });
        await fs.cp(sourceDir, destSkillDir, { recursive: true, force: true });
        await skillRepository.updateDeployedHash(userId, skill.id, currentHash);
        copied++;
      }

      logger.info(`[SkillService] syncDeployment for user ${userId}: copied=${copied}, skipped=${skipped}`);
    } catch (error) {
      logger.warn('[SkillService] syncDeployment failed, falling back to full deploy:', error);
      return this._fullDeployFallback(userId);
    }
  }

  /**
   * Full delete-and-copy fallback (original behavior).
   * Kept while incremental deployment is being validated.
   */
  private async _fullDeployFallback(userId: number): Promise<void> {
    try {
      const enabledSkills = await skillRegistry.getEnabledSkills(userId);
      const skillsDir = path.join(claudeService.getUserWorkspaceRoot(userId), '.claude', 'skills');
      await fs.rm(skillsDir, { recursive: true, force: true });
      await fs.mkdir(skillsDir, { recursive: true });

      let count = 0;
      for (const skill of enabledSkills) {
        if (!skill.skillPath) continue;
        const sourceDir = path.dirname(skill.skillPath);
        const destSkillDir = path.join(skillsDir, skill.id);
        await fs.cp(sourceDir, destSkillDir, { recursive: true, force: true });
        count++;
      }

      logger.info(`[SkillService] Full deploy ${count} skill(s) for user ${userId} → ${skillsDir}`);
    } catch (error) {
      logger.warn('[SkillService] Full deploy failed:', error);
    }
  }

  // ── Hermes bridge helpers ──────────────────────────────────────────────────

  /**
   * Ensure a DB preference record exists for a skill slug.
   * Called by Hermes after skill_manage creates a skill on the filesystem.
   */
  async ensureSkillRecord(userId: number, slug: string): Promise<SkillEntity> {
    const existing = await skillRepository.findByUserIdAndSlug(userId, slug);
    if (existing) return existing;

    const skillData: CreateSkillData = {
      slug,
      source: 'custom',
      isEnabled: true,
      userId,
    };
    return skillRepository.create(skillData);
  }

  /**
   * Build SKILL.md content from CreateSkillRequest
   */
  private buildSkillMarkdown(data: CreateSkillRequest): string {
    const frontmatter: Record<string, string> = {
      name: data.name,
      description: data.description,
    };

    if (data.category) {
      frontmatter.category = data.category;
    }

    const yamlLines = Object.entries(frontmatter)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}: ${this.quoteIfNeeded(v)}`);

    return `---
${yamlLines.join('\n')}
---

${data.prompt.trim()}
`;
  }

  /**
   * Quote a string if it contains special YAML characters
   */
  private quoteIfNeeded(value: string): string {
    if (value.includes(':') || value.includes('#') || value.includes('\n')) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
}

export const skillService = new SkillService();