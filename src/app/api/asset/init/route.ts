import { WithRequestContextStatic } from '@server/base/decorators';
import { BaseController } from '@renderer/api/base/baseController';
import { AssetAccountBizController } from '@/server/controller/assetAccount';

// Finnhub client encapsulated in finnhubService

class InitHttpController extends BaseController {
  /**
   * 初始化功能：根据当前持仓信息，调用 Finnhub API 更新每个持仓标的价格
   */
  @WithRequestContextStatic()
  static async GET() {
    const initController = new AssetAccountBizController();
    const data = await initController.init();
    return Response.json(data);
  }
}

export const GET = InitHttpController.GET;
