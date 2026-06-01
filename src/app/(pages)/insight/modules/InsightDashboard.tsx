'use client';

import { memo } from 'react';
import { AlertBanner } from '../components/AlertBanner';
import { AIInsightsDisplay } from '../components/AIInsightsDisplay';

export const RiskDashboard = memo(function RiskDashboard() {
  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      <AlertBanner />

      {/* Today's AI Insights */}
      <AIInsightsDisplay />
    </div>
  );
});
