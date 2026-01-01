import {
  PositionAsset,
  Portfolio,
  RiskInsights,
  Alert,
  Notification,
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
  notifications: Notification[];
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
  notifications: [],
  loading: false,
  error: null,
  strategyAdvice: [],
  diversificationRecommendations: [],
  analyzeScenariosLoading: false,
};
