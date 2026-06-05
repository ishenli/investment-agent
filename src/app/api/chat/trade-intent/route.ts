import { z } from 'zod';

import { BaseController } from '../../base/baseController';
import { WithRequestContextStatic } from '@/server/base/decorators';

const TradeIntentRequestSchema = z.object({
  action: z.enum(['buy', 'sell']),
  symbol: z.string().min(1),
  quantity: z.number().positive(),
  price: z.number().positive().optional(),
  orderType: z.enum(['market', 'limit']).optional(),
  idempotencyKey: z.string().min(1),
});

class TradeIntentHttpController extends BaseController {
  @WithRequestContextStatic()
  static async POST(request: Request) {
    const body = await super.validateBody(request, TradeIntentRequestSchema);

    // TODO: wire to transactionService with full validation:
    // - account ownership check
    // - permission / role check
    // - price staleness check
    // - risk control (position limits, daily loss limits)
    // - idempotency dedup by idempotencyKey

    return Response.json({
      success: true,
      data: {
        idempotencyKey: body.idempotencyKey,
        status: 'submitted',
        action: body.action,
        symbol: body.symbol,
        quantity: body.quantity,
      },
    });
  }
}

export const POST = TradeIntentHttpController.POST;
