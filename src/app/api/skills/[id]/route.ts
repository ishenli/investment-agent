/**
 * /api/skills/[id]
 *
 * GET    — get single skill by id
 * PUT    — update skill metadata
 * PATCH  — toggle skill enabled state
 * DELETE — delete skill (custom only)
 */

import { WithRequestContextStatic } from '@server/base/decorators';
import { BaseController } from '../../../api/base/baseController';
import { SkillController, UpdateSkillSchema, ToggleSkillSchema } from '@/server/controller/skill';

class SkillDetailHttpController extends BaseController {
  @WithRequestContextStatic()
  static async GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const controller = new SkillController();
    return Response.json(await controller.getSkillById({ id: parseInt(id, 10) }));
  }

  @WithRequestContextStatic()
  static async PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
      const controller = new SkillController();
      const body = await super.getBody(request);
      const { id } = await params;
      const validatedBody = await this.validateBody(
        { ...body, id: parseInt(id, 10) },
        UpdateSkillSchema,
      );
      return Response.json(await controller.updateSkill(validatedBody));
    } catch (error) {
      if (error instanceof Error && error.message.includes('Validation')) {
        return this.responseValidateError(JSON.parse(error.message));
      }
      return this.error('更新技能失败', 'UPDATE_SKILL_ERROR');
    }
  }

  /**
   * PATCH /api/skills/[id] — toggle skill enabled state
   * Body: { isEnabled: boolean }
   */
  @WithRequestContextStatic()
  static async PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
      const controller = new SkillController();
      const body = await super.getBody(request);
      const { id } = await params;
      const validatedBody = await this.validateBody(
        { ...body, id: parseInt(id, 10) },
        ToggleSkillSchema,
      );
      return Response.json(await controller.toggleSkill(validatedBody));
    } catch (error) {
      if (error instanceof Error && error.message.includes('Validation')) {
        return this.responseValidateError(JSON.parse(error.message));
      }
      return this.error('切换技能状态失败', 'TOGGLE_SKILL_ERROR');
    }
  }

  @WithRequestContextStatic()
  static async DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const controller = new SkillController();
    const { id } = await params;
    return Response.json(await controller.deleteSkill({ id: parseInt(id, 10) }));
  }
}

export const GET = SkillDetailHttpController.GET;
export const PUT = SkillDetailHttpController.PUT;
export const PATCH = SkillDetailHttpController.PATCH;
export const DELETE = SkillDetailHttpController.DELETE;
