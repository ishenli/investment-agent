/**
 * Skill Controller
 *
 * HTTP request handling layer: validates parameters and routes calls to SkillService.
 * Contains NO business logic — all orchestration is done in SkillService.
 */

import { WithRequestContext } from '../base/decorators';
import authService from '../service/authService';
import { skillService } from '../service/skillService';
import { BaseBizController } from './base';
import { z } from 'zod';
import type { SkillCategory, SkillSource } from '@typings/skill';
import logger from '../base/logger';

// ─── Validation schemas ───────────────────────────────────────────────────────

export const GetSkillsSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  source: z.string().optional(),
  limit: z.number().optional().default(100),
  offset: z.number().optional().default(0),
});

export const GetSkillByIdSchema = z.object({
  id: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const n = typeof val === 'string' ? parseInt(val, 10) : val;
      return n;
    })
    .refine((val) => !isNaN(val), { message: 'Invalid ID format' }),
});

export const CreateSkillSchema = z.object({
  slug: z.string().min(1, 'Slug is required'),
  name: z.string().min(1, 'Name is required'),
  prompt: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  category: z.enum([
    'brainstorming',
    'debugging',
    'tdd',
    'code-review',
    'testing',
    'documentation',
    'optimization',
    'refactoring',
    'other',
  ]),
  source: z.enum(['official', 'community', 'custom']).optional(),
  isEnabled: z.boolean().optional(),
  icon: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateSkillSchema = z.object({
  id: z.number(),
  slug: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  category: z
    .enum([
      'brainstorming',
      'debugging',
      'tdd',
      'code-review',
      'testing',
      'documentation',
      'optimization',
      'refactoring',
      'other',
    ])
    .optional(),
  isEnabled: z.boolean().optional(),
  icon: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const ToggleSkillSchema = z.object({
  id: z.number(),
  isEnabled: z.boolean(),
});

/**
 * Skill install schema — covers GitHub URL, ZIP upload, and folder upload.
 * All upload-method details are captured here; the Controller passes the
 * whole validated request to SkillService.installSkill().
 */
export const InstallSkillSchema = z.object({
  source: z.string().min(1, 'Skill source is required'),
  uploadMethod: z.enum(['github', 'zip', 'folder']).optional(),
  githubUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileCount: z.number().optional(),
});

// ─── Controller ───────────────────────────────────────────────────────────────

export class SkillController extends BaseBizController {
  // ── Query ──────────────────────────────────────────────────────────────

  @WithRequestContext()
  async getSkills(query: z.infer<typeof GetSkillsSchema>) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) return this.error('用户未登录', 'unauthorized');

      const parsed = await this.validateParams(query, GetSkillsSchema);

      const result = await skillService.getSkills(parseInt(userId), {
        search: parsed.search,
        category: parsed.category as SkillCategory | undefined,
        source: parsed.source as SkillSource | undefined,
        limit: parsed.limit,
        offset: parsed.offset,
      });

      return this.success(result);
    } catch (error) {
      if (error instanceof z.ZodError) return this.responseValidateError(error);
      return this.error('获取技能列表失败', 'get_skills_error');
    }
  }

  @WithRequestContext()
  async getSkillById(param: z.infer<typeof GetSkillByIdSchema>) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) return this.error('用户未登录', 'unauthorized');

      const parsed = await this.validateParams(param, GetSkillByIdSchema);
      const skill = await skillService.getSkill(parseInt(userId), parsed.id);

      if (!skill) return this.error('技能不存在', 'skill_not_found');

      return this.success({ skill });
    } catch (error) {
      if (error instanceof z.ZodError) return this.responseValidateError(error);
      return this.error('获取技能失败', 'get_skill_error');
    }
  }

  // ── Mutations ──────────────────────────────────────────────────────────

  @WithRequestContext()
  async createSkill(body: z.infer<typeof CreateSkillSchema>) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) return this.error('用户未登录', 'unauthorized');

      const parsed = await this.validateParams(body, CreateSkillSchema);
      const skill = await skillService.createSkill(parseInt(userId), parsed);

      return this.success({ skill });
    } catch (error) {
      if (error instanceof z.ZodError) return this.responseValidateError(error);
      if (error instanceof Error && error.message.includes('Skill slug already exists')) {
        return this.error('技能标识符已存在', 'skill_slug_exists');
      }
      logger.error('[SkillController] Error creating skill:', error);
      return this.error('创建技能失败', 'create_skill_error');
    }
  }

  @WithRequestContext()
  async updateSkill(body: z.infer<typeof UpdateSkillSchema>) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) return this.error('用户未登录', 'unauthorized');

      const parsed = await this.validateParams(body, UpdateSkillSchema);
      const skill = await skillService.updateSkill(parseInt(userId), parsed.id, parsed);

      if (!skill) return this.error('技能不存在', 'skill_not_found');

      return this.success({ skill });
    } catch (error) {
      if (error instanceof z.ZodError) return this.responseValidateError(error);
      if (error instanceof Error && error.message.includes('Skill slug already exists')) {
        return this.error('技能标识符已存在', 'skill_slug_exists');
      }
      return this.error('更新技能失败', 'update_skill_error');
    }
  }

  @WithRequestContext()
  async deleteSkill(body: z.infer<typeof GetSkillByIdSchema>) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) return this.error('用户未登录', 'unauthorized');

      const parsed = await this.validateParams(body, GetSkillByIdSchema);
      const result = await skillService.deleteSkill(parseInt(userId), parsed.id);

      if (!result) return this.error('技能不存在或无法删除', 'skill_not_found');

      return this.success({ message: '技能删除成功' });
    } catch (error) {
      if (error instanceof z.ZodError) return this.responseValidateError(error);
      if (error instanceof Error && error.message.includes('Cannot delete official skills')) {
        return this.error('官方技能不可删除', 'cannot_delete_official_skill');
      }
      return this.error('删除技能失败', 'delete_skill_error');
    }
  }

  @WithRequestContext()
  async toggleSkill(body: z.infer<typeof ToggleSkillSchema>) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) return this.error('用户未登录', 'unauthorized');

      const parsed = await this.validateParams(body, ToggleSkillSchema);
      const skill = await skillService.toggleSkill(parseInt(userId), parsed);

      if (!skill) return this.error('技能不存在', 'skill_not_found');

      return this.success({ skill });
    } catch (error) {
      if (error instanceof z.ZodError) return this.responseValidateError(error);
      return this.error('切换技能状态失败', 'toggle_skill_error');
    }
  }

  // ── Install / Sync ─────────────────────────────────────────────────────

  /**
   * Install skill(s) from an external source.
   * Supports: GitHub URL, owner/repo shorthand, ZIP file, local directory.
   */
  @WithRequestContext()
  async installSkill(body: z.infer<typeof InstallSkillSchema>) {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) return this.error('用户未登录', 'unauthorized');

      const parsed = await this.validateParams(body, InstallSkillSchema);
      const result = await skillService.installSkill(parseInt(userId), parsed);

      if (!result.success) {
        return this.error(result.error ?? '技能安装失败', 'skill_install_failed');
      }

      return this.success(result);
    } catch (error) {
      if (error instanceof z.ZodError) return this.responseValidateError(error);
      return this.error('安装技能失败', 'install_skill_error');
    }
  }

  /**
   * @deprecated Use installSkill() instead.
   * Kept for backward-compatibility with existing API consumers.
   */
  @WithRequestContext()
  async downloadSkill(body: { source: string }) {
    return this.installSkill(body);
  }

  @WithRequestContext()
  async syncBuiltinSkills() {
    try {
      const userId = await authService.getCurrentUserId();
      if (!userId) return this.error('用户未登录', 'unauthorized');

      const result = await skillService.syncBuiltinSkills(parseInt(userId));

      return this.success({ message: '内置技能同步完成', ...result });
    } catch (error) {
      logger.error('[SkillController] Sync builtin skills error:', error);
      return this.error('同步内置技能失败', 'sync_builtin_skills_error');
    }
  }
}
