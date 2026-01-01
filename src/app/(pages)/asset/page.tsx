'use client';

import { AlertBanner } from '@renderer/(pages)/insight/components/AlertBanner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs';
import { AssetDashboard } from './components/asset-dashboard';
import { RevenueAnalytics } from './components/revenue-analytics';

export default function AssetPage() {
  return (
    <div className="space-y-6 p-4">
          {/* Alert Banner */}
          <AlertBanner />

          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList>
              <TabsTrigger value="dashboard">账户信息</TabsTrigger>
              <TabsTrigger value="revenue">业绩分析</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-4">
              <AssetDashboard accountId="1" />
            </TabsContent>

            <TabsContent value="revenue" className="space-y-4">
              <RevenueAnalytics />
            </TabsContent>
          </Tabs>
        </div>
  );
}
