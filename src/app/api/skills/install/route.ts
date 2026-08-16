/**
 * /api/skills/install
 *
 * POST — install skill(s) from an external source (GitHub URL, ZIP, local path).
 */

import { WithRequestContextStatic } from '@server/base/decorators';
import { BaseController } from '../../../api/base/baseController';
import { SkillController, InstallSkillSchema } from '@/server/controller/skill';
import { cleanupStagedSkillUpload, stageSkillUploadFormData } from '@/server/lib/skill/skillUploadStaging';
import { z } from 'zod';

class SkillInstallHttpController extends BaseController {
  @WithRequestContextStatic()
  static async POST(request: Request) {
    let stagedUpload: Awaited<ReturnType<typeof stageSkillUploadFormData>> | undefined;

    try {
      const controller = new SkillController();
      const contentType = request.headers.get('content-type') ?? '';
      if (contentType.includes('multipart/form-data')) {
        stagedUpload = await stageSkillUploadFormData(await request.formData());
        return Response.json(await controller.installSkill({
          source: stagedUpload.source,
          uploadMethod: stagedUpload.uploadMethod,
        }));
      }

      const body = await super.getBody(request);
      const validatedBody = InstallSkillSchema.parse(body);
      return Response.json(await controller.installSkill(validatedBody));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }
      if (error instanceof Error && error.message.includes('Validation')) {
        return this.responseValidateError(JSON.parse(error.message));
      }
      return this.error('技能安装失败', 'INSTALL_SKILL_ERROR');
    } finally {
      if (stagedUpload) {
        await cleanupStagedSkillUpload(stagedUpload);
      }
    }
  }
}

export const POST = SkillInstallHttpController.POST;
