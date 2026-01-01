import logger, { Logger } from '@server/base/logger';
import { TradingAgentsGraph } from './tradingGraph';

const tradingAgentsGraph = new TradingAgentsGraph({
  logger: logger,
  selectedAnalysts: ['market', 'news'],
  config: {
    deep_think_llm: 'Kimi-K2-Instruct',
    quick_think_llm: 'Qwen3-30B-A3B-Thinking-2507',
  },
});

const graph = tradingAgentsGraph.graph;
export { graph };
