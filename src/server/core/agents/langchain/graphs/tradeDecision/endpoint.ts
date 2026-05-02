import logger, { Logger } from '@server/base/logger';
import { TradingAgentsGraph } from './tradingGraph';
import { getProjectDir } from '@server/base/env';

/**
 * Create a pre-configured TradingAgentsGraph instance
 * Usage: const graph = await createTradingGraph();
 */
export async function createTradingGraph(): Promise<TradingAgentsGraph> {
  return TradingAgentsGraph.create({
    logger: logger,
    selectedAnalysts: ['market', 'news'],
    projectDir: getProjectDir(),
  });
}