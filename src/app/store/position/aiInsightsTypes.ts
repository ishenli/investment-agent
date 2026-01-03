export interface AIInsight {
  id: string;
  title: string;
  description: string;
  confidence: number;
  type: 'opportunity' | 'risk' | 'suggestion';
  timestamp: Date;
  source?: string;
  metadata?: {
    relatedAssets?: string[];
    riskLevel?: 'low' | 'medium' | 'high';
    timeHorizon?: 'short-term' | 'medium-term' | 'long-term';
    confidenceReason?: string;
    dataFreshness?: 'realtime' | 'near-realtime' | 'daily' | 'historical';
    lastDataUpdate?: Date;
  };
}

export interface AIInsightRequest {
  positions: Array<{
    symbol: string;
    quantity: number;
    currentPrice: number;
    weight: number;
    sector: string;
    marketCap: number;
  }>;
  portfolio: {
    totalValue: number;
    cash: number;
    sectorAllocation: Record<string, number>;
    riskMetrics: {
      volatility: number;
      sharpeRatio: number;
      maxDrawdown: number;
    };
  };
  marketContext?: {
    marketTrend: 'bull' | 'bear' | 'neutral';
    volatilityIndex: number;
    economicIndicators: Record<string, any>;
  };
}

export interface AIInsightResponse {
  insights: AIInsight[];
  generatedAt: Date;
  modelVersion: string;
}
