'use client';

import { Button } from '@renderer/components/ui/button';
import { Plus, RefreshCw, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MarketInfoTabsProps {
  assetName: string;
  activeTab: 'latest' | 'history' | 'company' | 'basic-info' | 'investment-memo';
  setActiveTab: (tab: 'latest' | 'history' | 'company' | 'basic-info' | 'investment-memo') => void;
  onRefresh: () => void;
  onAddMarketInfo?: () => void;
  onAddCompanyInfo?: () => void;
  onAddInvestmentMemo?: () => void;
  onEditBasicInfo?: () => void;
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
}: MarketInfoTabsProps) {
  const { t } = useTranslation('asset-meta');
  
  return (
    <div className="flex justify-between items-center">
      <h4 className="text-xl font-bold">{t('detail.title', { name: assetName })}</h4>
      <div className="flex gap-2">
        {/* 在最新市场纪要和历史市场纪要标签页下显示添加按钮 */}
        {(activeTab === 'latest' || activeTab === 'history') && onAddMarketInfo && (
          <Button onClick={onAddMarketInfo} variant="default" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            {t('detail.actions.addMarketInfo')}
          </Button>
        )}
        {/* 在公司信息标签页下显示添加按钮 */}
        {activeTab === 'company' && onAddCompanyInfo && (
          <Button onClick={onAddCompanyInfo} variant="default" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            {t('detail.actions.addCompanyInfo')}
          </Button>
        )}
        {/* 在基本信息标签页下显示编辑按钮 */}
        {activeTab === 'basic-info' && onEditBasicInfo && (
          <Button onClick={onEditBasicInfo} variant="default" size="sm">
            <Pencil className="mr-2 h-4 w-4" />
            {t('detail.actions.editBasicInfo')}
          </Button>
        )}
        {/* 在投资笔记标签页下显示添加按钮 */}
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