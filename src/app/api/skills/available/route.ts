import { WithRequestContextStatic } from '@server/base/decorators';
import { BaseController } from '../../../api/base/baseController';
import { SkillController } from '@/server/controller/skill';

class AvailableSkillsHttpController extends BaseController {
  @WithRequestContextStatic()
  static async GET(request: Request) {
    const controller = new SkillController();
    // 可以从查询参数获取过滤条件
    const query = await super.getQuery(request);
    return Response.json(await controller.getSkills(query));
  }
}

export const GET = AvailableSkillsHttpController.GET;