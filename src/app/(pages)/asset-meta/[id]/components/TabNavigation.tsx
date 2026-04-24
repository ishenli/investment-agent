'use client';

import { useTranslation } from 'react-i18next';
import { AssetMetaType } from '@/types/assetMeta';

type TabKey = 'latest' | 'history' | 'company' | 'basic-info' | 'investment-memo';

interface TabNavigationProps {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  assetType?: AssetMetaType['assetType'];
}

function isFundLike(assetType?: string): boolean {
  return assetType === 'fund' || assetType === 'etf';
}

export function TabNavigation({ activeTab, setActiveTab, assetType }: TabNavigationProps) {
  const { t } = useTranslation('asset-meta');
  const fundLike = isFundLike(assetType);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'latest', label: t('detail.tabs.latest') },
    { key: 'history', label: t('detail.tabs.history') },
    { key: 'company', label: fundLike ? t('detail.tabs.fundOverview') : t('detail.tabs.company') },
    { key: 'basic-info', label: t('detail.tabs.basicInfo') },
    { key: 'investment-memo', label: t('detail.tabs.investmentMemo') },
  ];

  return (
    <div className="border-b">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}