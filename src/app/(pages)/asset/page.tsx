'use client';

import { AlertBanner } from '@renderer/(pages)/insight/components/AlertBanner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs';
import { AssetDashboard, CurrencySwitcher, type DisplayCurrency } from './components/asset-dashboard';
import { RevenueAnalytics } from './components/revenue-analytics';
import { useAccountGuard } from '@renderer/hooks/useAccountGuard';
import { PriceRefreshButton } from '@renderer/components/refresh-button';
import { AssetStructure } from './components/asset-structure';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

export default function AssetPage() {
  // 保护页面，确保用户有账户才能访问
  useAccountGuard();
  const { t } = useTranslation('asset');
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>('USD');

  return (
    <div className="space-y-6 p-4">
      {/* Alert Banner */}
      <AlertBanner />

      <Tabs defaultValue="dashboard" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="dashboard">{t('tabs.dashboard')}</TabsTrigger>
            <TabsTrigger value="revenue">{t('tabs.revenue')}</TabsTrigger>
            <TabsTrigger value="position">{t('tabs.position')}</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <CurrencySwitcher value={displayCurrency} onChange={setDisplayCurrency} />
            {/* 添加价格刷新按钮 */}
            <PriceRefreshButton
              size="sm"
              showText={true}
            />
          </div>
        </div>

        <TabsContent value="dashboard" className="space-y-4">
          <AssetDashboard accountId="1" displayCurrency={displayCurrency} />
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <RevenueAnalytics />
        </TabsContent>

        <TabsContent value="position" className="space-y-4">
          <AssetStructure />
        </TabsContent>
      </Tabs>
    </div>
  );
}
