'use client';

import { memo } from 'react';
import { AlertBanner } from '../components/AlertBanner';
import { DiversificationRecommendation } from '../components/DiversificationRecommendation';
import { StrategyAdvice } from '../components/StrategyAdvice';
import { AIInsightsDisplay } from '../components/AIInsightsDisplay';

export const RiskDashboard = memo(function RiskDashboard() {

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      <AlertBanner />

      {/* AI Insights */}
      <AIInsightsDisplay />

      {/* Diversification Recommendations */}
      <DiversificationRecommendation />

      {/* Strategy Advice */}
      <StrategyAdvice />
    </div>
  );
});
