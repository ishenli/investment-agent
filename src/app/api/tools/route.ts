import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '../base/baseController';
import { ToolBizController } from '@/server/controller/toolController';

class ToolHttpController extends BaseController {
  static controller = new ToolBizController();

  @WithRequestContext()
  static async GET() {
    return Response.json(await ToolHttpController.controller.list());
  }
}

export const GET = ToolHttpController.GET;
