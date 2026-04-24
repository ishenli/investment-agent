'use client';

import { Button } from '@renderer/components/ui/button';
import { Badge } from '@renderer/components/ui/badge';
import { Plus, RefreshCw, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AssetMetaType } from '@/types/assetMeta';

interface MarketInfoTabsProps {
  assetName: string;
  assetType?: AssetMetaType['assetType'];
  activeTab: 'latest' | 'history' | 'company' | 'basic-info' | 'investment-memo';
  setActiveTab: (tab: 'latest' | 'history' | 'company' | 'basic-info' | 'investment-memo') => void;
  onRefresh: () => void;
  onAddMarketInfo?: () => void;
  onAddCompanyInfo?: () => void;
  onAddInvestmentMemo?: () => void;
  onEditBasicInfo?: () => void;
}

const assetTypeColorMap: Record<string, string> = {
  stock: 'bg-blue-100 text-blue-800',
  etf: 'bg-purple-100 text-purple-800',
  fund: 'bg-emerald-100 text-emerald-800',
  crypto: 'bg-orange-100 text-orange-800',
};

function isFundLike(assetType?: string): boolean {
  return assetType === 'fund' || assetType === 'etf';
}

export function MarketInfoTabs({
  activeTab,
  setActiveTab,
  onRefresh,
  onAddMarketInfo,
  onAddCompanyInfo,
  onAddInvestmentMemo,
  onEditBasicInfo,
  assetName,
  assetType,
}: MarketInfoTabsProps) {
  const { t } = useTranslation('asset-meta');
  const fundLike = isFundLike(assetType);

  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-3">
        <h4 className="text-xl font-bold">{t('detail.title', { name: assetName })}</h4>
        {assetType && (
          <Badge className={assetTypeColorMap[assetType] || 'bg-gray-100 text-gray-800'}>
            {t(`assetTypeLabels.${assetType}`)}
          </Badge>
        )}
      </div>
      <div className="flex gap-2">
        {(activeTab === 'latest' || activeTab === 'history') && onAddMarketInfo && (
          <Button onClick={onAddMarketInfo} variant="default" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            {t('detail.actions.addMarketInfo')}
          </Button>
        )}
        {activeTab === 'company' && onAddCompanyInfo && (
          <Button onClick={onAddCompanyInfo} variant="default" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            {fundLike ? t('detail.actions.addFundInfo') : t('detail.actions.addCompanyInfo')}
          </Button>
        )}
        {activeTab === 'basic-info' && onEditBasicInfo && (
          <Button onClick={onEditBasicInfo} variant="default" size="sm">
            <Pencil className="mr-2 h-4 w-4" />
            {t('detail.actions.editBasicInfo')}
          </Button>
        )}
        {activeTab === 'investment-memo' && onAddInvestmentMemo && (
          <Button onClick={onAddInvestmentMemo} variant="default" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            {t('detail.actions.addInvestmentMemo')}
          </Button>
        )}
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('actions.refresh')}
        </Button>
      </div>
    </div>
  );
}