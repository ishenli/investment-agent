import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '../base/baseController';
import { ExchangeRateBizController } from '@/server/controller/exchangeRate';

class ExchangeRateHttpController extends BaseController {
  static controller = new ExchangeRateBizController();

  @WithRequestContext()
  static async GET(request: Request) {
    return Response.json(await ExchangeRateHttpController.controller.getRates());
  }

  @WithRequestContext()
  static async PUT(request: Request) {
    const body = await super.getBody(request);
    return Response.json(await ExchangeRateHttpController.controller.updateRate(body));
  }

  @WithRequestContext()
  static async DELETE(request: Request) {
    const json = await super.getQuery(request);
    return Response.json(await ExchangeRateHttpController.controller.deleteRate(json));
  }
}

export const GET = ExchangeRateHttpController.GET;
export const PUT = ExchangeRateHttpController.PUT;
export const DELETE = ExchangeRateHttpController.DELETE;
