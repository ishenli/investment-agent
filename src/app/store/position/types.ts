import { AssetType } from '@typings/asset';

// Position Asset Type
export interface PositionAsset {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  liquidityScore: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercentage: number;
  weight: number;
  sector?: AssetType;
  exchange?: string;
  investmentMemo?: string | null;
  lastUpdated: Date;
}

// Portfolio Type
export interface Portfolio {
  id: string;
  userId: string;
  totalValue: number;
  totalNonCashValue: number;
  cashValue: number;
  concentrationRiskScore: number;
  correlationRiskScore: number;
  liquidityRiskScore: number;
  allocationRiskScore: number;
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  lastUpdated: Date;
  riskMode: 'retail' | 'advanced';
}

// Risk Insights Type
export interface RiskInsights {
  id: string;
  portfolioId: string;
  timestamp: Date;
  // concentrationData: 集中度数据，用于ConcentrationChart组件显示
  concentrationData: {
    topAssets: Array<{ symbol: string; name: string; weight: number }>;
    singleAssetThreshold: number;
    concentrationAlerts: string[];
  };
  // allocationData: 资产配置数据，用于AllocationChart组件显示
  allocationData: {
    categoryAllocation: Array<{ category: string; weight: number }>;
    allocationAlerts: string[];
  };
  // correlationData: 相关性数据，用于CorrelationHeatmap组件显示
  correlationData: {
    // correlationMatrix: 相关性矩阵，用于相关性热力图显示
    // correlationMatrix: number[][];
    // highCorrelationPairs: 高相关性资产对，用于风险仪表板显示
    // highCorrelationPairs: Array<{ asset1: string; asset2: string; correlation: number }>;
    // correlationAlerts: string[];
  };
  // strategySuggestions: 策略建议，用于风险仪表板显示
  strategySuggestions: string[];
}

// Alert Type
export interface Alert {
  id: string;
  type: 'concentration' | 'correlation' | 'liquidity' | 'allocation';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

// Notification Type
export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: 'alert' | 'suggestion' | 'update';
}

// Diversification Recommendation Type
export interface DiversificationRecommendation {
  id: string;
  assetId: string;
  assetSymbol: string;
  assetName: string;
  amount: number;
  correlation: number;
  liquidityScore: number;
  reason: string;
}

// Strategy Advice Type
export interface StrategyAdvice {
  id: string;
  title: string;
  description: string;
  recommended: boolean;
}
