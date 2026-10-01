'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
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
  SparklesIcon,
  ClockIcon,
  LightbulbIcon,
  Loader2,
} from 'lucide-react';
import dayjs from 'dayjs';
import type {
  InsightHistoryItem,
  InsightHistoryListResponse,
} from '@/types/aiInsight';

const PAGE_SIZE = 10;

export function InsightHistory() {
  const { t } = useTranslation('insight');

  const [items, setItems] = useState<InsightHistoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchInsights = useCallback(async (page: number, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });

      const res = await fetch(`/api/insight-history?${params}`);
      const result = await res.json();
      if (result.success) {
        const data = result.data as InsightHistoryListResponse;
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
  }, []);

  useEffect(() => {
    fetchInsights(1);
  }, [fetchInsights]);

  const handleLoadMore = () => {
    if (currentPage < totalPages) {
      fetchInsights(currentPage + 1, true);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
            {items.map((insight) => (
              <Card key={insight.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <SparklesIcon className="h-4 w-4 shrink-0" />
                      <CardTitle className="text-base truncate">{insight.title}</CardTitle>
                    </div>
                    <Badge variant="secondary">{t('history.type.agent')}</Badge>
                  </div>
                  <CardDescription className="line-clamp-2 mt-1">
                    {insight.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ClockIcon className="h-3 w-3" />
                      {dayjs(insight.createdAt).format('YYYY-MM-DD HH:mm')}
                    </span>
                    {insight.sessionId && (
                      <Button asChild size="sm" variant="outline" className="ml-auto">
                        <Link
                          href={`/chat?session=${insight.sessionId}&topic=${insight.topicId}`}
                        >
                          {t('history.viewSession')}
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
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
