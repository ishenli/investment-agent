import { Annotation } from '@langchain/langgraph';
import { BaseMessage } from 'langchain';

// 股票信息类型
export interface StockInfo {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  market: string;
  currency: string;
}

// 基金信息类型 (Mock)
export interface FundInfo {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  market: string;
}

// 板块信息类型 (Mock)
export interface SectorInfo {
  name: string;
  change: number;
  changePercent: number;
  topPerformers: string[];
  bottomPerformers: string[];
}

// 指数信息类型 (Mock)
export interface IndexInfo {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  market: string;
}

// 市场信息图状态接口
export interface MarketInformationState {
  // 用户问题
  userQuery: string;

  // 股票信息
  stockInfo: StockInfo[];

  // 基金信息
  fundInfo: FundInfo[];

  // 板块信息
  sectorInfo: SectorInfo[];

  // 指数信息
  indexInfo: IndexInfo[];

  // 市场分析结果
  marketAnalysis: string;

  // 聊天相关字段
  chatHistory: BaseMessage[];
  turnCount: number;
}

// 创建市场信息状态注解
export const MarketInformationGraphState = Annotation.Root({
  userQuery: Annotation<string>,
  stockInfo: Annotation<StockInfo[]>,
  fundInfo: Annotation<FundInfo[]>,
  sectorInfo: Annotation<SectorInfo[]>,
  indexInfo: Annotation<IndexInfo[]>,
  marketAnalysis: Annotation<string>,
  chatHistory: Annotation<BaseMessage[]>,
  turnCount: Annotation<number>,
});
