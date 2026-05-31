'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import {
  LightbulbIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  RotateCcwIcon,
  ClockIcon,
  RefreshCw,
} from 'lucide-react';
import dayjs from 'dayjs';
import { Button } from '@renderer/components/ui/button';
import { Spinner } from '@renderer/components/ui/spinner';
import {
  useAIInsightsQuery,
  useGenerateAIInsightsMutation,
} from '@renderer/hooks/usePositionQueries';
import { cn } from '@/app/lib/utils';
import { useTranslation } from 'react-i18next';
import type { AiInsightResponse } from '@/types/aiInsight';

// 数据新鲜度映射到中文和颜色
const dataFreshnessConfig = {
  realtime: { label: '实时', color: 'bg-green-500' },
  'near-realtime': { label: '近实时', color: 'bg-blue-500' },
  daily: { label: '当日', color: 'bg-yellow-500' },
  historical: { label: '历史', color: 'bg-gray-500' },
};

type DataFreshness = keyof typeof dataFreshnessConfig;

function getMetadataString(metadata: Record<string, unknown> | null, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : null;
}

function getRelatedAssets(metadata: Record<string, unknown> | null): unknown[] {
  const value = metadata?.relatedAssets;
  return Array.isArray(value) ? value : [];
}

// 置信度颜色映射
const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 90) return 'bg-green-500';
  if (confidence >= 80) return 'bg-blue-500';
  if (confidence >= 70) return 'bg-yellow-500';
  return 'bg-gray-500';
};

// AI洞察显示组件
export function AIInsightsDisplay() {
  const { t } = useTranslation('insight');
  const { data: aiInsights, isLoading: isAIInsightsLoading, isRefetching } = useAIInsightsQuery();
  const generateMutation = useGenerateAIInsightsMutation();

  // 手动触发AI洞察请求
  const handleFetchAIInsights = async () => {
    await generateMutation.mutateAsync();
  };

  // 加载中状态
  if (isAIInsightsLoading || isRefetching) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            {t('opportunityFinder.loadingTitle')}
          </CardTitle>
          <CardDescription>{t('opportunityFinder.loadingDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Spinner />
            <p>{t('loading.analyzing')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 如果没有洞察，显示空状态
  if (!aiInsights || aiInsights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t('aiInsights.title')}</CardTitle>
          <CardDescription>{t('aiInsights.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <LightbulbIcon className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <p>{t('aiInsights.noData')}</p>
            <p className="mt-1 text-sm text-muted-foreground/70">{t('aiInsights.noDataHint')}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={handleFetchAIInsights}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  {t('loading.analyzing')}
                </>
              ) : (
                <>
                  <RotateCcwIcon className="h-4 w-4 mr-2" />
                  {t('aiInsights.generate')}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardDescription>{t('aiInsights.description')}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleFetchAIInsights()}
            disabled={generateMutation.isPending || isRefetching}
          >
            <RefreshCw
              className={cn(
                'h-4 w-4 mr-2',
                (generateMutation.isPending || isRefetching) && 'animate-spin',
              )}
            />
            {generateMutation.isPending ? t('loading.analyzing') : t('aiInsights.generate')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {aiInsights.map((insight: AiInsightResponse) => {
            const confidence = Number(insight.confidence ?? 0);
            const dataFreshness = getMetadataString(insight.metadata, 'dataFreshness');
            const confidenceReason = getMetadataString(insight.metadata, 'confidenceReason');
            const lastDataUpdate = getMetadataString(insight.metadata, 'lastDataUpdate');
            const relatedAssets = getRelatedAssets(insight.metadata);
            const freshness =
              dataFreshness && dataFreshness in dataFreshnessConfig
                ? dataFreshnessConfig[dataFreshness as DataFreshness]
                : null;

            return (
              <div key={insight.id} className="flex flex-col gap-3 p-4 rounded-lg border">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {insight.type === 'opportunity' && (
                      <TrendingUpIcon className="h-5 w-5 text-green-500" />
                    )}
                    {insight.type === 'risk' && (
                      <AlertTriangleIcon className="h-5 w-5 text-red-500" />
                    )}
                    {insight.type === 'suggestion' && (
                      <LightbulbIcon className="h-5 w-5 text-yellow-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm">{insight.title}</h3>
                      <Badge className={`text-xs ${getConfidenceColor(confidence)} text-white`}>
                        {confidence.toFixed(0)}% {t('badge.confidence')}
                      </Badge>
                      {freshness && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <ClockIcon className="h-3 w-3" />
                          {freshness.label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                  </div>
                </div>

                {/* 置信度说明和时间信息 */}
                {(confidenceReason || lastDataUpdate || relatedAssets.length > 0) && (
                  <div className="bg-muted/50 rounded-md p-3 text-xs space-y-2">
                    {confidenceReason && (
                      <div className="flex gap-2">
                        <span className="text-muted-foreground font-medium">
                          {t('metadata.confidenceBasis')}：
                        </span>
                        <span className="text-foreground">{confidenceReason}</span>
                      </div>
                    )}
                    {lastDataUpdate && (
                      <div className="flex gap-2">
                        <span className="text-muted-foreground font-medium">
                          {t('metadata.dataTime')}：
                        </span>
                        <span className="text-foreground">
                          {dayjs(lastDataUpdate).format('YYYY-MM-DD HH:mm')}
                        </span>
                      </div>
                    )}
                    {relatedAssets.length > 0 && (
                      <div className="flex gap-2">
                        <span className="text-muted-foreground font-medium">
                          {t('metadata.relatedAssets')}：
                        </span>
                        <div className="flex gap-1 flex-wrap">
                          {relatedAssets.map((asset, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs px-1.5 py-0 h-5">
                              {String(asset)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
