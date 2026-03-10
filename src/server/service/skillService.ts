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
 *
 * Note: Database only stores user preferences (slug, source, isEnabled, icon).
 * Content fields (name, description, category, prompt) come from SKILL.md files.
 */

import logger from '@server/base/logger';
import { skillRepository, type CreateSkillData, type UpdateSkillData } from '../repository/skillRepository';
import { skillRegistry } from '../lib/skill/SkillRegistry';
import { skillInstaller } from '../lib/skill/SkillInstaller';
import { getProjectRoot } from '../base/env';
import path from 'path';
import fs from 'fs/promises';
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
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 将用户已启用的技能部署到 memory/claude/{userId}/.claude/skills/。
   *
   * Claude Agent SDK 将该目录作为 cwd，通过 {cwd}/.claude/skills/ 自动发现技能文件。
   * 在技能状态发生变更时调用，而非每次 Chat 请求，避免重复写入。
   *
   * @param userId - 用户 ID，用于隔离部署目录
   */
  private async deployEnabledSkills(userId: number): Promise<void> {
    try {
      const enabledSkills = await skillRegistry.getEnabledSkills(userId);
      const skillsDir = path.join(getProjectRoot(), 'memory', 'claude', String(userId), '.claude', 'skills');

      await fs.mkdir(skillsDir, { recursive: true });

      // 将每个已启用的技能写入为 {slug}.md
      const enabledSlugs = new Set<string>();
      for (const skill of enabledSkills) {
        if (!skill.prompt) continue;

        const skillSourceDir = path.dirname(skill.skillPath);

        // 将技能内容中的相对 Markdown 链接改写为绝对路径，
        // 确保 Claude 通过 Read 工具访问 references/ 等引用文件时不会路径失败
        const content = skill.prompt.replace(
          /\[([^\]]+)\]\((?!https?:\/\/)([^)]+)\)/g,
          (_match, text: string, relPath: string) => {
            return `[${text}](${path.join(skillSourceDir, relPath)})`;
          },
        );

        await fs.writeFile(path.join(skillsDir, `${skill.id}.md`), content, 'utf-8');
        enabledSlugs.add(skill.id);
      }

      // 清理不再已启用的旧技能文件
      const existing = await fs.readdir(skillsDir).catch(() => []);
      for (const entry of existing) {
        if (entry.endsWith('.md') && !enabledSlugs.has(entry.slice(0, -3))) {
          await fs.unlink(path.join(skillsDir, entry)).catch(() => {});
        }
      }

      logger.info(`[SkillService] Deployed ${enabledSlugs.size} skill(s) for user ${userId} → ${skillsDir}`);
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