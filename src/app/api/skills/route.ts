/**
 * /api/skills
 *
 * GET    — list skills (with optional search/category/source/pagination)
 * POST   — create a custom skill
 * PATCH  — toggle skill enabled/disabled state
 */

import { WithRequestContextStatic } from '@server/base/decorators';
import { BaseController } from '@/app/api/base/baseController';
import { SkillController, CreateSkillSchema, ToggleSkillSchema } from '@/server/controller/skill';

class SkillsHttpController extends BaseController {
  @WithRequestContextStatic()
  static async GET(request: Request) {
    const controller = new SkillController();
    const query = await super.getQuery(request);
    return Response.json(await controller.getSkills(query));
  }

  @WithRequestContextStatic()
  static async POST(request: Request) {
    try {
      const controller = new SkillController();
      const body = await super.getBody(request);
      return Response.json(await controller.createSkill(body));
    } catch (error) {
      if (error instanceof Error && error.message.includes('Validation')) {
        return this.responseValidateError(JSON.parse(error.message));
      }
      return this.error('创建技能失败', 'CREATE_SKILL_ERROR');
    }
  }

  /**
   * PATCH /api/skills — toggle skill enabled state
   * Body: { id: number, isEnabled: boolean }
   */
  @WithRequestContextStatic()
  static async PATCH(request: Request) {
    try {
      const controller = new SkillController();
      const body = await super.getBody(request);
      const validatedBody = await this.validateBody(body, ToggleSkillSchema);
      return Response.json(await controller.toggleSkill(validatedBody));
    } catch (error) {
      if (error instanceof Error && error.message.includes('Validation')) {
        return this.responseValidateError(JSON.parse(error.message));
      }
      return this.error('切换技能状态失败', 'TOGGLE_SKILL_ERROR');
    }
  }
}

export const GET = SkillsHttpController.GET;
export const POST = SkillsHttpController.POST;
export const PATCH = SkillsHttpController.PATCH;
