'use client';

import { useTranslation } from 'react-i18next';
import { RiskDashboard } from './modules/InsightDashboard';
import { InsightHistory } from './modules/InsightHistory';
import { useAccountGuard } from '@renderer/hooks/useAccountGuard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs';

export default function InsightPage() {
  useAccountGuard();
  const { t } = useTranslation('insight');

  return (
    <div className="container mx-auto p-8">
      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">{t('tabs.today')}</TabsTrigger>
          <TabsTrigger value="history">{t('tabs.history')}</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard">
          <RiskDashboard />
        </TabsContent>
        <TabsContent value="history">
          <InsightHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
