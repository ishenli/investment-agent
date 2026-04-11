import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '../../base/baseController';
import { ExchangeRateBizController } from '@/server/controller/exchangeRate';

class InitDefaultsHttpController extends BaseController {
  static controller = new ExchangeRateBizController();

  @WithRequestContext()
  static async POST(request: Request) {
    return Response.json(await InitDefaultsHttpController.controller.initializeDefaults());
  }
}

export const POST = InitDefaultsHttpController.POST;
