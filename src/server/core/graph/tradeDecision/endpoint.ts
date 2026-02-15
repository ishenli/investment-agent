import logger, { Logger } from '@server/base/logger';
import { TradingAgentsGraph } from './tradingGraph';

/**
 * Create a pre-configured TradingAgentsGraph instance
 * Usage: const graph = await createTradingGraph();
 */
export async function createTradingGraph(): Promise<TradingAgentsGraph> {
  return TradingAgentsGraph.create({
    logger: logger,
    selectedAnalysts: ['market', 'news'],
    config: {
      deep_think_llm: 'Kimi-K2-Instruct',
      quick_think_llm: 'Qwen3-30B-A3B-Thinking-2507',
    },
  });
}
