'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Button } from '@renderer/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import { Badge } from '@renderer/components/ui/badge';
import { Progress } from '@renderer/components/ui/progress';
import { IconPlayerPlay, IconLoader2, IconSettings, IconCategory, IconTarget } from '@tabler/icons-react';
import { post } from '@/app/lib/request';

interface EvalConfigPanelProps {
  onRunStarted: (runId: string) => void;
}

export function EvalConfigPanel({ onRunStarted }: EvalConfigPanelProps) {
  const { t } = useTranslation('setting');
  const [engine, setEngine] = React.useState('mock');
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>(['asset-query']);
  const [threshold, setThreshold] = React.useState('0.7');
  const [concurrency, setConcurrency] = React.useState('3');
  const [running, setRunning] = React.useState(false);
  const [progress, setProgress] = React.useState<{
    status: string;
    score?: number;
    totalCases?: number;
    passedCases?: number;
    failedCases?: number;
  } | null>(null);

  const ENGINES = [
    { value: 'mock', label: t('evaluation.config.engines.mock') },
    { value: 'hermes', label: t('evaluation.config.engines.hermes') },
    { value: 'claude', label: t('evaluation.config.engines.claude') },
    { value: 'deepagents', label: t('evaluation.config.engines.deepagents') },
  ];

  const CATEGORIES = [
    { value: 'asset-query', label: t('evaluation.config.categories.asset-query') },
    { value: 'portfolio-analysis', label: t('evaluation.config.categories.portfolio-analysis') },
    { value: 'market-research', label: t('evaluation.config.categories.market-research') },
    { value: 'multi-turn', label: t('evaluation.config.categories.multi-turn') },
    { value: 'edge-cases', label: t('evaluation.config.categories.edge-cases') },
  ];

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const handleStart = async () => {
    if (selectedCategories.length === 0) return;
    setRunning(true);
    setProgress(null);

    try {
      const result = await post('/api/evaluation', {
        concurrency: Number(concurrency),
        engine,
        categories: selectedCategories,
        threshold: Number(threshold),
      });

      const runId = result.data?.runId;
      if (!runId) throw new Error('No runId returned');

      const eventSource = new EventSource(`/api/evaluation/${runId}/stream`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'status') {
            setProgress({
              status: data.status,
              score: data.score,
              totalCases: data.totalCases,
              passedCases: data.passedCases,
              failedCases: data.failedCases,
            });
          }
          if (data.type === 'done' || data.type === 'error') {
            eventSource.close();
            setRunning(false);
            onRunStarted(runId);
          }
        } catch {
          // ignore parse errors
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setRunning(false);
        onRunStarted(runId);
      };
    } catch (error) {
      console.error('Failed to start evaluation:', error);
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Config Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <IconSettings className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{t('evaluation.config.title')}</CardTitle>
              <CardDescription className="mt-1">
                {t('evaluation.config.description')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Engine & Threshold & Concurrency Row */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="space-y-2.5">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <IconTarget className="h-4 w-4 text-muted-foreground" />
                {t('evaluation.config.engine')}
              </label>
              <Select value={engine} onValueChange={setEngine} disabled={running}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select engine" />
                </SelectTrigger>
                <SelectContent>
                  {ENGINES.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2.5">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <IconTarget className="h-4 w-4 text-muted-foreground" />
                {t('evaluation.config.threshold')}
              </label>
              <Select value={threshold} onValueChange={setThreshold} disabled={running}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select threshold" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">{t('evaluation.config.thresholds.0.5')}</SelectItem>
                  <SelectItem value="0.7">{t('evaluation.config.thresholds.0.7')}</SelectItem>
                  <SelectItem value="0.8">{t('evaluation.config.thresholds.0.8')}</SelectItem>
                  <SelectItem value="0.9">{t('evaluation.config.thresholds.0.9')}</SelectItem>
                  <SelectItem value="0.95">{t('evaluation.config.thresholds.0.95')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2.5">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <IconTarget className="h-4 w-4 text-muted-foreground" />
                {t('evaluation.config.concurrency')}
              </label>
              <Select value={concurrency} onValueChange={setConcurrency} disabled={running}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select concurrency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Categories Section */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <IconCategory className="h-4 w-4 text-muted-foreground" />
              {t('evaluation.config.category')}
            </label>
            <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
              <div className="flex flex-wrap gap-2.5">
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.value);
                  return (
                    <Badge
                      key={cat.value}
                      variant={isSelected ? 'default' : 'outline'}
                      className={`
                        cursor-pointer px-3 py-1.5 text-sm font-medium transition-all duration-200
                        ${isSelected 
                          ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90' 
                          : 'hover:border-primary/50 hover:bg-muted/50'
                        }
                        ${running ? 'cursor-not-allowed opacity-60' : ''}
                      `}
                      onClick={() => !running && toggleCategory(cat.value)}
                    >
                      {cat.label}
                    </Badge>
                  );
                })}
              </div>
              {selectedCategories.length === 0 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Please select at least one category
                </p>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-between border-t border-border/50 pt-6">
            <p className="text-sm text-muted-foreground">
              {selectedCategories.length} categor{selectedCategories.length === 1 ? 'y' : 'ies'} selected
            </p>
            <Button 
              onClick={handleStart} 
              disabled={running || selectedCategories.length === 0}
              size="lg"
              className="min-w-[160px]"
            >
              {running ? (
                <>
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('evaluation.config.running')}
                </>
              ) : (
                <>
                  <IconPlayerPlay className="mr-2 h-4 w-4" />
                  {t('evaluation.config.startButton')}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress Card */}
      {running && progress && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Status Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <IconLoader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t('evaluation.progress.status')}
                    </p>
                    <p className="text-lg font-semibold capitalize text-primary">
                      {progress.status}
                    </p>
                  </div>
                </div>
                {progress.score !== undefined && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {t('evaluation.progress.score')}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {(progress.score * 100).toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <Progress 
                  value={progress.status === 'running' ? 50 : 100} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {progress.status === 'running' 
                    ? 'Processing evaluation cases...' 
                    : 'Evaluation completed'}
                </p>
              </div>

              {/* Stats Row */}
              {progress.totalCases !== undefined && (
                <div className="grid grid-cols-3 gap-4 rounded-lg border border-border/50 bg-background/50 p-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                      {t('evaluation.progress.total')}
                    </p>
                    <p className="mt-1 text-xl font-bold text-foreground">
                      {progress.totalCases}
                    </p>
                  </div>
                  <div className="text-center border-l border-r border-border/50">
                    <p className="text-xs text-muted-foreground">
                      {t('evaluation.progress.passed')}
                    </p>
                    <p className="mt-1 text-xl font-bold text-green-600">
                      {progress.passedCases}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                      {t('evaluation.progress.failed')}
                    </p>
                    <p className="mt-1 text-xl font-bold text-red-600">
                      {progress.failedCases}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
