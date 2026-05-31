'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import { Button } from '@renderer/components/ui/button';
import {
  TrendingUpIcon,
  AlertTriangleIcon,
  LightbulbIcon,
  ClockIcon,
  CalendarIcon,
  Loader2,
} from 'lucide-react';
import dayjs from 'dayjs';
import type {
  AiInsightResponse,
  AiInsightListResponse,
  InsightType,
  InsightSource,
} from '@/types/aiInsight';

const TYPE_CONFIG: Record<
  InsightType,
  { icon: typeof TrendingUpIcon; variant: 'default' | 'destructive' | 'secondary' }
> = {
  opportunity: { icon: TrendingUpIcon, variant: 'default' },
  risk: { icon: AlertTriangleIcon, variant: 'destructive' },
  suggestion: { icon: LightbulbIcon, variant: 'secondary' },
};

const SOURCE_VARIANT: Record<InsightSource, 'outline' | 'secondary'> = {
  manual: 'outline',
  scheduled: 'secondary',
};

const PAGE_SIZE = 10;

export function InsightHistory() {
  const { t } = useTranslation('insight');

  const [items, setItems] = useState<AiInsightResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [filterSource, setFilterSource] = useState<InsightSource | undefined>();
  const [filterType, setFilterType] = useState<InsightType | undefined>();

  const fetchInsights = useCallback(
    async (page: number, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
        if (filterSource) params.set('source', filterSource);
        if (filterType) params.set('type', filterType);

        const res = await fetch(`/api/ai-insights?${params}`);
        const result = await res.json();
        if (result.success) {
          const data = result.data as AiInsightListResponse;
          setItems((prev) => (append ? [...prev, ...data.items] : data.items));
          setTotalCount(data.totalCount);
          setTotalPages(data.totalPages);
          setCurrentPage(data.currentPage);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filterSource, filterType],
  );

  useEffect(() => {
    fetchInsights(1);
  }, [fetchInsights]);

  const handleLoadMore = () => {
    if (currentPage < totalPages) {
      fetchInsights(currentPage + 1, true);
    }
  };

  const sourceOptions: (InsightSource | undefined)[] = [undefined, 'manual', 'scheduled'];
  const typeOptions: (InsightType | undefined)[] = [undefined, 'opportunity', 'risk', 'suggestion'];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('history.filters.source')}:</span>
          {sourceOptions.map((s) => (
            <Button
              key={s ?? 'all'}
              variant={filterSource === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterSource(s)}
            >
              {s ? t(`history.source.${s}`) : t('history.filters.all')}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('history.filters.type')}:</span>
          {typeOptions.map((tp) => (
            <Button
              key={tp ?? 'all'}
              variant={filterType === tp ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType(tp)}
            >
              {tp ? t(`history.type.${tp}`) : t('history.filters.all')}
            </Button>
          ))}
        </div>
      </div>

      {/* Total count */}
      {totalCount > 0 && (
        <p className="text-sm text-muted-foreground">{t('history.total', { count: totalCount })}</p>
      )}

      {/* Empty state */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <LightbulbIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">{t('history.noData')}</p>
            <p className="text-sm text-muted-foreground/70 mt-1">{t('history.noDataHint')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Insight cards */}
          <div className="space-y-3">
            {items.map((insight) => {
              const typeConfig = TYPE_CONFIG[insight.type];
              const TypeIcon = typeConfig.icon;

              return (
                <Card key={insight.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <TypeIcon className="h-4 w-4 shrink-0" />
                        <CardTitle className="text-base truncate">{insight.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant={typeConfig.variant}>
                          {t(`history.type.${insight.type}`)}
                        </Badge>
                        <Badge variant={SOURCE_VARIANT[insight.source]}>
                          {t(`history.source.${insight.source}`)}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription className="line-clamp-2 mt-1">
                      {insight.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {insight.confidence != null && (
                        <span className="flex items-center gap-1">
                          {t('history.confidence')}: {Math.round(insight.confidence)}%
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-3 w-3" />
                        {dayjs(insight.createdAt).format('YYYY-MM-DD HH:mm')}
                      </span>
                      {insight.source === 'scheduled' && insight.jobId && (
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          Job #{insight.jobId}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Load more */}
          {currentPage < totalPages && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t('history.loadMore')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
