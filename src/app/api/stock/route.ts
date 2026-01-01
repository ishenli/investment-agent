import { WithRequestContext, WithRequestContextStatic } from '@server/base/decorators';
import { BaseController } from '../base/baseController';
import logger from '@server/base/logger';
import stockService from '@server/service/stockService';
import { StockAnalysisRequestSchema } from '@/types';
import { SSEEmitter } from '@server/base/sseEmitter';
import { createSSEResponse } from '@server/base/responseUtil';

class StockController extends BaseController {
  @WithRequestContextStatic()
  static async POST(request: Request) {
    const body = await this.validateBody(request, StockAnalysisRequestSchema);
    const sseEmitter = new SSEEmitter();
    (async () => {
      try {
        await stockService.analysis({
          options: body,
          sessionId: '12334',
          emitter: sseEmitter,
        });
        // return this.success(data);
      } catch (error) {
        logger.error('[StockController] 获取股票分析数据失败:', error);
        // return this.error('获取股票分析数据失败', 'get_stock_analysis_error');
      } finally {
        sseEmitter.close();
      }
    })();

    return createSSEResponse(sseEmitter.readable);
  }
}

export const POST = StockController.POST;
