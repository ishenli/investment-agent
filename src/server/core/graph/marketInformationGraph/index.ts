import { AbstractGraph } from "../abstractGraph";
import { StateGraph, END, START } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import type { Logger } from '@server/base/logger';
import { MarketInformationGraphState } from './state';
import { createMarketInfoAnalyzer } from './nodes';
import { chatModelOpenAI, ModelNameType } from "../../provider/chatModel";

export type MarketInformationGraphOptionsType = {
  logger: Logger;
  modelCode: ModelNameType;
};

export class MarketInformationGraph extends AbstractGraph {
  llm: ChatOpenAI;
  logger: Logger;

  constructor(options: MarketInformationGraphOptionsType) {
    super();
    this.logger = options.logger;
    this.llm = chatModelOpenAI(options.modelCode);
  }

  setup(): Promise<void> {
    // 创建并返回工作流
    this.setupMarketInformationGraph();
    return Promise.resolve();
  }

  setupMarketInformationGraph() {
    const workflow = new StateGraph(MarketInformationGraphState);

    // 创建节点
    const marketInfoAnalyzer = createMarketInfoAnalyzer(this.llm, this.logger);

    // 添加节点到工作流
    workflow
      .addNode('market_analyzer', marketInfoAnalyzer)
      .addEdge(START, 'market_analyzer')
      .addEdge('market_analyzer', END);

    return workflow.compile();
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
  type MarketInformationState
} from './state';


export {
  createMarketInfoAnalyzer,
} from './nodes';
