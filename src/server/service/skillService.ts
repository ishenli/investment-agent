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
import { skillRepository, type CreateSkillData, type UpdateSkillData } from '../repository/skillRepository';
import { skillRegistry } from '../lib/skill/SkillRegistry';
import { skillInstaller } from '../lib/skill/SkillInstaller';
import path from 'path';
import fs from 'fs/promises';
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
      await this.deployEnabledSkills(userId);

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

      // Write SKILL.md file
      skillInstaller.createCustomSkill(data.slug, skillContent);

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
      await this.deployEnabledSkills(userId);

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
            });
          } catch (error) {
            logger.warn('[SkillService] Failed to update SKILL.md:', error);
            // Continue to update DB preference even if file update fails
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
      await this.deployEnabledSkills(userId);

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
          skillInstaller.deleteCustomSkillFiles(slug);
        } catch (error) {
          logger.warn('[SkillService] Failed to delete SKILL.md:', error);
          // Continue to delete DB record even if file deletion fails
        }
      }

      const result = await skillRepository.deleteBySlug(userId, slug);
      skillRegistry.invalidate(userId);

      // 技能删除后重新部署（会自动清理该技能的 .md 文件）
      await this.deployEnabledSkills(userId);

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

        // 安装成功后部署新技能
        await this.deployEnabledSkills(userId);
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
      const parsedSkills = skillFileScanner.scan();

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
      await this.deployEnabledSkills(userId);

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

  /**
   * 将用户已启用的技能部署到 memory/claude/{userId}/.claude/skills/。
   *
   * Claude Code 规范：每个 skill 必须是一个子目录包（{slug}/SKILL.md）。
   * 每次调用先清空整个 skillsDir，再将所有已启用 skill 的源目录批量覆盖复制进去。
   *
   * @param userId - 用户 ID，用于隔离部署目录
   */
  private async deployEnabledSkills(userId: number): Promise<void> {
    try {
      const enabledSkills = await skillRegistry.getEnabledSkills(userId);
      const skillsDir = path.join(claudeService.getUserWorkspaceRoot(userId), '.claude', 'skills');

      // 清空后重建，确保不残留已禁用技能
      await fs.rm(skillsDir, { recursive: true, force: true });
      await fs.mkdir(skillsDir, { recursive: true });

      // 批量复制：将每个源目录整体拷贝为 {skillsDir}/{slug}，覆盖写入
      let count = 0;
      for (const skill of enabledSkills) {
        if (!skill.skillPath) continue;
        const sourceDir = path.dirname(skill.skillPath);
        const destSkillDir = path.join(skillsDir, skill.id);
        await fs.cp(sourceDir, destSkillDir, { recursive: true, force: true });
        count++;
      }

      logger.info(`[SkillService] Deployed ${count} skill(s) for user ${userId} → ${skillsDir}`);
    } catch (error) {
      // 部署失败不应阻断主流程，记录日志即可
      logger.warn('[SkillService] Failed to deploy enabled skills:', error);
    }
  }

  /**
   * Build SKILL.md content from CreateSkillRequest
   */
  private buildSkillMarkdown(data: CreateSkillRequest): string {
    const frontmatter: Record<string, string> = {
      name: data.name,
      description: data.description,
    };

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