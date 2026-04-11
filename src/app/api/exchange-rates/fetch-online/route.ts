import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '../../base/baseController';
import { ExchangeRateBizController } from '@/server/controller/exchangeRate';

class FetchOnlineHttpController extends BaseController {
  static controller = new ExchangeRateBizController();

  @WithRequestContext()
  static async POST(request: Request) {
    return Response.json(await FetchOnlineHttpController.controller.fetchFromAPI());
  }
}

export const POST = FetchOnlineHttpController.POST;
