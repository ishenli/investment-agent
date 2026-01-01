import { Annotation } from '@langchain/langgraph';
import { BaseMessage } from 'langchain';
import { RemoveMessage } from '@langchain/core/messages';
import type { PositionType } from '@typings/position';

// 资产配置类型
export interface AssetAllocation {
  stock: number;
  cash: number;
}

// 资产分类详情
export interface AssetBreakdown {
  stocks: {
    count: number;
    totalValue: number;
    totalCost: number;
    unrealizedPnL: number;
  };
  cash: {
    amount: number;
    currency: string;
    percentage: number;
  };
}

// 现金资产类型
export interface CashAsset {
  type: 'cash';
  amount: number;
  currency: string;
  available: number;
}

// 投资组合指标类型
export interface PortfolioMetrics {
  totalMarketValue: number;
  cashBalance: number;
  totalAssetsValue: number;
  totalAssetsCost: number;
  totalUnrealizedPnL: number;
  positionCount: number;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  diversificationScore: number;
  allocation: AssetAllocation;
}

// 市场情绪类型
export interface MarketSentiment {
  overall: 'bullish' | 'bearish' | 'neutral';
  sectors: Record<string, 'bullish' | 'bearish' | 'neutral'>;
  newsSentiment: number; // -1 to 1
}

// 风险评估类型
export interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number; // 0-100
  volatility: number;
  maxDrawdown: number;
  recommendations: string[];
}

// 投资建议类型
export interface InvestmentRecommendation {
  symbol: string;
  action: 'buy' | 'sell' | 'hold' | 'watch';
  reason: string;
  targetPrice?: number;
  stopLoss?: number;
  confidence: number; // 0-100
}

// 用户意图类型
export type UserIntent =
  | 'portfolio_analysis'
  | 'stock_research'
  | 'market_news'
  | 'risk_assessment'
  | 'general_inquiry'
  | 'transaction_history'
  | 'asset_allocation';

// 投资咨询对话状态接口
export interface InvestmentChatState {
  // 用户问题
  userQuery: string;

  // 分析阶段
  analysisStage: 'initial' | 'market_analysis' | 'risk_assessment' | 'recommendation';

  // 对话上下文
  context: {
    // 用户持仓摘要 - 复用Asset数据
    holdingsSummary: PositionType[];

    // 现金资产详情
    cashAsset: CashAsset;

    // 投资组合指标 - 复用risk_assessment工具
    portfolioMetrics: PortfolioMetrics;

    // 资产分类统计
    assetBreakdown: AssetBreakdown;

    // 市场情绪 - 复用news_analyst输出
    marketSentiment: MarketSentiment;
  };

  // 市场分析结果
  marketAnalysis: string;

  // 风险评估结果
  riskAssessment: RiskAssessment;

  // 具体建议
  specificRecommendation: InvestmentRecommendation[];

  // CopilotKit协作
  sidenotes: string[]; // 侧边栏提示
  followups: string[]; // 用户后续问题建议

  // 聊天相关字段
  chatHistory: BaseMessage[]; // 聊天历史记录
  turnCount: number; // 对话轮次计数
  userIntent: UserIntent; // 用户意图识别
}

// 创建投资咨询状态注解，专为投资咨询场景设计
export const InvestmentChatStateAnnotation = Annotation.Root({
  // 投资咨询专用字段
  userQuery: Annotation<string>,
  analysisStage: Annotation<'initial' | 'market_analysis' | 'risk_assessment' | 'recommendation'>,
  context: Annotation<{
    holdingsSummary: PositionType[];
    cashAsset: CashAsset;
    portfolioMetrics: PortfolioMetrics;
    assetBreakdown: AssetBreakdown;
    marketSentiment: MarketSentiment;
  }>,
  marketAnalysis: Annotation<string>,
  riskAssessment: Annotation<RiskAssessment>,
  specificRecommendation: Annotation<InvestmentRecommendation[]>,

  // CopilotKit协作
  sidenotes: Annotation<string[]>,
  followups: Annotation<string[]>,

  // 聊天相关字段
  chatHistory: Annotation<BaseMessage[]>,
  turnCount: Annotation<number>,
  userIntent: Annotation<UserIntent>,
});
