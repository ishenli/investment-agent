'use client';

import { useTranslation } from 'react-i18next';

interface TabNavigationProps {
  activeTab: 'latest' | 'history' | 'company' | 'basic-info' | 'investment-memo';
  setActiveTab: (tab: 'latest' | 'history' | 'company' | 'basic-info' | 'investment-memo') => void;
}

export function TabNavigation({ activeTab, setActiveTab }: TabNavigationProps) {
  const { t } = useTranslation('asset-meta');
  
  return (
    <div className="border-b">
      <nav className="-mb-px flex space-x-8">
        <button
          className={`py-4 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'latest'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
          }`}
          onClick={() => setActiveTab('latest')}
        >
          {t('detail.tabs.latest')}
        </button>
        <button
          className={`py-4 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'history'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
          }`}
          onClick={() => setActiveTab('history')}
        >
          {t('detail.tabs.history')}
        </button>
        <button
          className={`py-4 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'company'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
          }`}
          onClick={() => setActiveTab('company')}
        >
          {t('detail.tabs.company')}
        </button>
        <button
          className={`py-4 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'basic-info'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
          }`}
          onClick={() => setActiveTab('basic-info')}
        >
          {t('detail.tabs.basicInfo')}
        </button>
        <button
          className={`py-4 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'investment-memo'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
          }`}
          onClick={() => setActiveTab('investment-memo')}
        >
          {t('detail.tabs.investmentMemo')}
        </button>
      </nav>
    </div>
  );
}