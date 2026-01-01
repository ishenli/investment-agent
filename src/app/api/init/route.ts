import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '@renderer/api/base/baseController';
import { InitController } from '@server/controller/init';

// Finnhub client encapsulated in finnhubService

class InitHttpController extends BaseController {
  /**
   * 初始化功能：根据当前持仓信息，调用 Finnhub API 更新每个持仓标的价格
   */
  @WithRequestContext()
  static async GET() {
    const initController = new InitController();
    const data = await initController.init();
    return Response.json(data)
  }
}

export const GET = InitHttpController.GET;