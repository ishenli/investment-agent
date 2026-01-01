export type Signal = 'bullish' | 'bearish' | 'neutral' | 'unknown';

export interface WarrenBuffettSignal {
  signal: Signal;
  confidence: number; // 0-100
  reasoning: string;
}

export interface AgentState {
  data: {
    end_date: string;
    tickers: string[];
    analyst_signals: Record<string, any>;
  };
  metadata: {
    show_reasoning: boolean;
    [key: string]: any;
  };
}

export interface AnalysisData {
  ticker: string;
  score: number;
  max_score: number;
  fundamental_analysis: {
    score: number;
    details: string;
    metrics: any;
  };
  consistency_analysis: {
    score: number;
    details: string;
  };
  moat_analysis: {
    score: number;
    max_score: number;
    details: string;
  };
  pricing_power_analysis: {
    score: number;
    details: string;
  };
  book_value_analysis: {
    score: number;
    details: string;
  };
  management_analysis: {
    score: number;
    max_score: number;
    details: string;
  };
  intrinsic_value_analysis: {
    intrinsic_value?: number;
    details: string[];
    owner_earnings?: number;
    assumptions?: any;
  };
  market_cap?: number;
  margin_of_safety?: number;
}
