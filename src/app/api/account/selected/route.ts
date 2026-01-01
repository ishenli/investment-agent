import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '@renderer/api/base/baseController';
import { AccountBizController } from '@/server/controller/account';

class SelectedAccountHttpController extends BaseController {
  static controller = new AccountBizController();
  
  @WithRequestContext()
  static async GET(request: Request) {
    const json = await super.getQuery(request);
    return Response.json(await SelectedAccountHttpController.controller.getSelectedAccount(json));
  }

  @WithRequestContext()
  static async POST(request: Request) {
    const body = await super.getBody(request);
    return Response.json(await SelectedAccountHttpController.controller.setSelectedAccount(body));
  }
}

export const GET = SelectedAccountHttpController.GET;
export const POST = SelectedAccountHttpController.POST;
