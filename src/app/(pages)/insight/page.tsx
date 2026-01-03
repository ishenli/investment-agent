'use client';

import { InsightDashboardClientWrapper } from './modules/InsightDashboardClientWrapper';
import { useAccountGuard } from '@renderer/hooks/useAccountGuard';

export default function InsightPage() {
  // 保护页面，确保用户有账户才能访问
  useAccountGuard();

  return (
    <div className="container mx-auto p-8">
      <InsightDashboardClientWrapper />
    </div>
  );
}