import {
  PositionAsset,
  Portfolio,
  RiskInsights,
  Alert,
  DiversificationRecommendation,
  StrategyAdvice,
} from './types';
import { AIInsight } from './aiInsightsTypes';

export interface PositionState {
  positions: PositionAsset[];
  portfolio: Portfolio | null;
  riskInsights: RiskInsights | null;
  aiInsights: AIInsight[];
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  strategyAdvice: StrategyAdvice[];
  diversificationRecommendations: DiversificationRecommendation[];
  analyzeScenariosLoading: boolean;
}

export const initialPositionState: PositionState = {
  positions: [],
  portfolio: null,
  riskInsights: null,
  aiInsights: [],
  alerts: [],
  loading: false,
  error: null,
  strategyAdvice: [],
  diversificationRecommendations: [],
  analyzeScenariosLoading: false,
};
