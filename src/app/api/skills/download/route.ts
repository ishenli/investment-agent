/**
 * /api/skills/download
 *
 * POST — install skill(s) from an external source (GitHub URL, ZIP, local path).
 *
 * @deprecated Prefer /api/skills/install for new integrations.
 *             This route is kept for backward compatibility.
 */

import { WithRequestContextStatic } from '@server/base/decorators';
import { BaseController } from '../../../api/base/baseController';
import { SkillController, InstallSkillSchema } from '@/server/controller/skill';

class SkillInstallHttpController extends BaseController {
  @WithRequestContextStatic()
  static async POST(request: Request) {
    try {
      const controller = new SkillController();
      const body = await super.getBody(request);
      const validatedBody = await this.validateBody(body, InstallSkillSchema);
      return Response.json(await controller.installSkill(validatedBody));
    } catch (error) {
      if (error instanceof Error && error.message.includes('Validation')) {
        return this.responseValidateError(JSON.parse(error.message));
      }
      return this.error('技能安装失败', 'INSTALL_SKILL_ERROR');
    }
  }
}

export const POST = SkillInstallHttpController.POST;
