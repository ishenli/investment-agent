import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '../../base/baseController';
import { ExchangeRateBizController } from '@/server/controller/exchangeRate';

class ResetDefaultsHttpController extends BaseController {
  static controller = new ExchangeRateBizController();

  @WithRequestContext()
  static async POST(request: Request) {
    return Response.json(await ResetDefaultsHttpController.controller.resetToDefaults());
  }
}

export const POST = ResetDefaultsHttpController.POST;
