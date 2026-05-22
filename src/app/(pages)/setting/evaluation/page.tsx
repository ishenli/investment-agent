'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs';
import { EvalConfigPanel } from './components/EvalConfigPanel';
import { EvalHistoryList } from './components/EvalHistoryList';
import { EvalResultView } from './components/EvalResultView';

export default function EvaluationPage() {
  const { t } = useTranslation('setting');
  const [activeRunId, setActiveRunId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState('run');

  const handleRunStarted = (runId: string) => {
    setActiveRunId(runId);
    setActiveTab('result');
  };

  const handleSelectRun = (runId: string) => {
    setActiveRunId(runId);
    setActiveTab('result');
  };

  const handleDeleted = () => {
    setActiveRunId(null);
    setActiveTab('history');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('evaluation.title')}</h2>
        <p className="text-muted-foreground">{t('evaluation.description')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="run">{t('evaluation.tabs.run')}</TabsTrigger>
          <TabsTrigger value="history">{t('evaluation.tabs.history')}</TabsTrigger>
          {activeRunId && <TabsTrigger value="result">{t('evaluation.tabs.result')}</TabsTrigger>}
        </TabsList>

        <TabsContent value="run" className="mt-4">
          <EvalConfigPanel onRunStarted={handleRunStarted} />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <EvalHistoryList onSelectRun={handleSelectRun} />
        </TabsContent>

        {activeRunId && (
          <TabsContent value="result" className="mt-4">
            <EvalResultView runId={activeRunId} onDeleted={handleDeleted} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
