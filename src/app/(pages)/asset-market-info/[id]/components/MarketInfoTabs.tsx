'use client';

import { useState } from 'react';
import { Button } from '@renderer/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';

interface MarketInfoTabsProps {
  assetName: string;
  activeTab: 'latest' | 'history' | 'company' | 'investment-memo';
  setActiveTab: (tab: 'latest' | 'history' | 'company' | 'investment-memo') => void;
  onRefresh: () => void;
  onAddCompanyInfo?: () => void;
  onAddInvestmentMemo?: () => void;
}

export function MarketInfoTabs({ activeTab, setActiveTab, onRefresh, onAddCompanyInfo, onAddInvestmentMemo, assetName }: MarketInfoTabsProps) {
  return (
    <div className="flex justify-between items-center">
      <h4 className="text-xl font-bold">{assetName}资产信息详情</h4>
      <div className="flex gap-2">
        {/* 在公司信息标签页下显示添加按钮 */}
        {activeTab === 'company' && onAddCompanyInfo && (
          <Button onClick={onAddCompanyInfo} variant="default" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            添加公司纪要
          </Button>
        )}
        {/* 在投资笔记标签页下显示添加按钮 */}
        {activeTab === 'investment-memo' && onAddInvestmentMemo && (
          <Button onClick={onAddInvestmentMemo} variant="default" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            添加投资笔记
          </Button>
        )}
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          刷新
        </Button>
      </div>
    </div>
  );
}