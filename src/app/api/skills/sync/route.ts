/**
 * /api/skills/sync
 *
 * POST — invalidate the server-side SkillRegistry cache and sync built-in skills
 *        into the user's DB preference table.
 *
 * Call this before re-fetching the skills list so that manually placed SKILL.md
 * files are picked up without a server restart.
 */

import { WithRequestContextStatic } from '@server/base/decorators';
import { BaseController } from '../../../api/base/baseController';
import { SkillController } from '@/server/controller/skill';

class SkillSyncHttpController extends BaseController {
  @WithRequestContextStatic()
  static async POST(_request: Request) {
    try {
      const controller = new SkillController();
      return Response.json(await controller.syncBuiltinSkills());
    } catch (error) {
      return this.error('技能同步失败', 'SYNC_SKILLS_ERROR');
    }
  }
}

export const POST = SkillSyncHttpController.POST;
