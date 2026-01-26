import { AdapterRouter } from './AdapterRouter';
import { FinnhubAdapter } from './FinnhubAdapter';
import { TencentAdapter } from './TencentAdapter';
import type { PriceSourceAdapter } from './PriceSourceAdapter';

export { AdapterRouter, FinnhubAdapter, TencentAdapter };
export type { PriceSourceAdapter };

/**
 * 创建默认适配器实例
 */
export function createDefaultRouter(): AdapterRouter {
  const router = new AdapterRouter();

  // 注册适配器
  router.register(new FinnhubAdapter());
  router.register(new TencentAdapter());

  return router;
}