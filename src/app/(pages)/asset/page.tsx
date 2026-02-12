'use client';

import { AlertBanner } from '@renderer/(pages)/insight/components/AlertBanner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs';
import { AssetDashboard } from './components/asset-dashboard';
import { RevenueAnalytics } from './components/revenue-analytics';
import { useAccountGuard } from '@renderer/hooks/useAccountGuard';
import { PriceRefreshButton } from '@renderer/components/refresh-button';
import { AssetStructure } from './components/asset-structure';

export default function AssetPage() {
  // 保护页面，确保用户有账户才能访问
  useAccountGuard();

  return (
    <div className="space-y-6 p-4">
      {/* Alert Banner */}
      <AlertBanner />

      <Tabs defaultValue="dashboard" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="dashboard">账户信息</TabsTrigger>
            <TabsTrigger value="revenue">业绩分析</TabsTrigger>
            <TabsTrigger value="position">资产结构</TabsTrigger>
          </TabsList>

          {/* 添加价格刷新按钮 */}
          <PriceRefreshButton
            size="sm"
            showText={true}
            className="ml-4"
          />
        </div>

        <TabsContent value="dashboard" className="space-y-4">
          <AssetDashboard accountId="1" />
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
