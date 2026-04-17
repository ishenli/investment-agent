/* eslint-disable @next/next/no-img-element */
'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@renderer/components/ui/tabs';
import { AlertTriangleIcon } from 'lucide-react';
import { usePositionsQuery } from '@renderer/hooks/useAssetQueries';
import { usePositionStore } from '@renderer/store/position/store';
import { EditPositionDialog } from './components/EditPositionDialog';
import { PositionType } from '@typings/position';
import { Skeleton } from '@renderer/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { StockPositionsTable } from './components/StockPositionsTable';
import { FundPositionsTable } from './components/FundPositionsTable';

export function PositionManagement() {
  const { t } = useTranslation('asset-management');
  const [activeTab, setActiveTab] = useState('stock');
  const [isEditPositionOpen, setIsEditPositionOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<PositionType | null>(null);

  const { data: positions = [], isLoading, isError, refetch } = usePositionsQuery();
  const { alerts } = usePositionStore();

  // 按资产类型分组：股票 vs 基金
  const stockPositions = positions.filter((p) => (p.sector || 'stock') !== 'fund');
  const fundPositions = positions.filter((p) => p.sector === 'fund');

  const handleEditPosition = (position: PositionType) => {
    setSelectedPosition(position);
    setIsEditPositionOpen(true);
  };

  const handleUpdatePositions = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-9 w-48 mb-4" />
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="text-red-500 font-semibold text-lg">{t('error.title')}</div>
            <div className="text-sm text-muted-foreground">{t('error.description')}</div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <TabsList>
                <TabsTrigger value="stock">
                  {t('tab.stock')}
                  {stockPositions.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">
                      {stockPositions.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="fund">
                  {t('tab.fund')}
                  {fundPositions.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">
                      {fundPositions.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>

          {/* ===== 股票持仓 Tab ===== */}
          <TabsContent value="stock">
            <StockPositionsTable
              positions={stockPositions}
              onEditPosition={handleEditPosition}
            />
          </TabsContent>

          {/* ===== 基金持仓 Tab ===== */}
          <TabsContent value="fund">
            <FundPositionsTable
              positions={fundPositions}
              onEditPosition={handleEditPosition}
            />
          </TabsContent>
        </Card>
      </Tabs>

      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('alerts.title')}</CardTitle>
            <CardDescription>{t('alerts.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  <AlertTriangleIcon
                    className={`h-5 w-5 mt-0.5 ${
                      alert.severity === 'high'
                        ? 'text-red-500'
                        : alert.severity === 'medium'
                          ? 'text-yellow-500'
                          : 'text-green-500'
                    }`}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{alert.message}</p>
                    <p className="text-sm text-muted-foreground">
                      {alert.timestamp.toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      alert.severity === 'high'
                        ? 'destructive'
                        : alert.severity === 'medium'
                          ? 'secondary'
                          : 'default'
                    }
                  >
                    {alert.severity === 'high'
                      ? t('alerts.high')
                      : alert.severity === 'medium'
                        ? t('alerts.medium')
                        : t('alerts.low')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <EditPositionDialog
        open={isEditPositionOpen}
        onOpenChange={setIsEditPositionOpen}
        position={selectedPosition}
        onUpdate={handleUpdatePositions}
      />
    </div>
  );
}
