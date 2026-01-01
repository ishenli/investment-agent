'use client';

import { useState } from 'react';

interface TabNavigationProps {
  activeTab: 'latest' | 'history' | 'company' | 'investment-memo';
  setActiveTab: (tab: 'latest' | 'history' | 'company' | 'investment-memo') => void;
}

export function TabNavigation({ activeTab, setActiveTab }: TabNavigationProps) {
  return (
    <div className="border-b">
      <nav className="-mb-px flex space-x-8">
        <button
          className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'latest'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          onClick={() => setActiveTab('latest')}
        >
          最新市场纪要
        </button>
        <button
          className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'history'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          onClick={() => setActiveTab('history')}
        >
          历史市场纪要
        </button>
        <button
          className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'company'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          onClick={() => setActiveTab('company')}
        >
          公司纪要
        </button>
        <button
          className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'investment-memo'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          onClick={() => setActiveTab('investment-memo')}
        >
          投资笔记
        </button>
      </nav>
    </div>
  );
}