import { AbstractGraph } from '../abstractGraph';
import { StateGraph, END, START } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import type { Logger } from '@server/base/logger';
import { MarketInformationGraphState } from './state';
import { createMarketInfoAnalyzer } from './nodes';
import { chatModelOpenAI, ModelNameType } from '../../provider/chatModel';

export type MarketInformationGraphOptionsType = {
  logger: Logger;
  modelCode: ModelNameType;
};

export class MarketInformationGraph extends AbstractGraph {
  llm?: ChatOpenAI;
  logger: Logger;
  modelCode: ModelNameType;
  compiledGraph?: any;

  constructor(options: MarketInformationGraphOptionsType) {
    super();
    this.logger = options.logger;
    this.modelCode = options.modelCode;
  }

  async setup(): Promise<void> {
    // Initialize the LLM with async config resolution
    this.llm = await chatModelOpenAI(this.modelCode);
    // 创建并返回工作流
    this.compiledGraph = this.setupMarketInformationGraph();
  }

  setupMarketInformationGraph() {
    const workflow = new StateGraph(MarketInformationGraphState);

    if (!this.llm) {
      throw new Error('LLM not initialized');
    }

    // 创建节点
    const marketInfoAnalyzer = createMarketInfoAnalyzer(this.llm, this.logger);

    // 添加节点到工作流
    workflow
      .addNode('market_analyzer', marketInfoAnalyzer)
      .addEdge(START, 'market_analyzer')
      .addEdge('market_analyzer', END);

    return workflow.compile();
  }

  async invoke(state: typeof MarketInformationGraphState.State) {
    if (!this.compiledGraph) {
      await this.setup();
    }
    return this.compiledGraph.invoke(state);
  }

  // 创建初始状态
  createInitialState(userQuery: string): typeof MarketInformationGraphState.State {
    return {
      userQuery,
      stockInfo: [],
      fundInfo: [],
      sectorInfo: [],
      indexInfo: [],
      marketAnalysis: '',
      chatHistory: [],
      turnCount: 0,
    };
  }
}

// 导出所有相关类型和接口
export {
  MarketInformationGraphState,
  type StockInfo,
  type FundInfo,
  type SectorInfo,
  type IndexInfo,
  type MarketInformationState,
} from './state';

export { createMarketInfoAnalyzer } from './nodes';