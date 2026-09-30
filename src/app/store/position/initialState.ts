import { PositionAsset, Portfolio, RiskInsights, Alert } from './types';

export interface PositionState {
  positions: PositionAsset[];
  portfolio: Portfolio | null;
  riskInsights: RiskInsights | null;
  alerts: Alert[];
  loading: boolean;
  error: string | null;
}

export const initialPositionState: PositionState = {
  positions: [],
  portfolio: null,
  riskInsights: null,
  alerts: [],
  loading: false,
  error: null,
};
