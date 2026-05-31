'use client';

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@renderer/components/ui/table';
import { useDiversificationRecommendationsQuery } from '@renderer/hooks/usePositionQueries';
import { Spinner } from '@renderer/components/ui/spinner';
import { RecommendationType } from '@typings/insight';
import { PieChartIcon, RefreshCw } from 'lucide-react';
import { cn } from '@renderer/lib/utils';
import { useTranslation } from 'react-i18next';

// 分散建议组件
export function DiversificationRecommendation() {
  const { t } = useTranslation('insight');
  const {
    data: recommendations,
    isLoading: isDiversificationLoading,
    refetch,
    isFetching,
  } = useDiversificationRecommendationsQuery<RecommendationType[]>();

  const header = (
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div className="flex flex-col space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-lg font-semibold">{t('portfolioCheck.title')}</CardTitle>
          <Badge variant="outline">{t('portfolioCheck.badge')}</Badge>
        </div>
        <CardDescription>{t('diversification.description')}</CardDescription>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => refetch()}
        disabled={isDiversificationLoading || isFetching}
        className="h-8 w-8"
      >
        <RefreshCw
          className={cn('h-4 w-4', (isDiversificationLoading || isFetching) && 'animate-spin')}
        />
      </Button>
    </CardHeader>
  );

  if (isDiversificationLoading) {
    return (
      <Card>
        {header}
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Spinner />
            <p>{t('loading.analyzing')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  // 如果没有建议，显示空状态
  if (!recommendations || recommendations.length === 0) {
    return (
      <Card>
        {header}
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            {t('diversification.noData')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {header}
      <CardContent>
        <div className="mb-4 flex items-start gap-3 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
          <PieChartIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{t('portfolioCheck.explanation')}</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('table.asset')}</TableHead>
              <TableHead>{t('table.suggestedAmount')}</TableHead>
              <TableHead>{t('table.correlation')}</TableHead>
              <TableHead>{t('table.liquidity')}</TableHead>
              <TableHead>{t('table.reason')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recommendations.map((recommendation) => (
              <TableRow key={recommendation.id}>
                <TableCell>
                  <div className="font-medium">{recommendation.assetSymbol}</div>
                  <div className="text-sm text-muted-foreground">{recommendation.assetName}</div>
                </TableCell>
                <TableCell className="font-medium">
                  ${recommendation.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <div
                    className={
                      recommendation.correlation < 0.3
                        ? 'text-green-500'
                        : recommendation.correlation < 0.7
                          ? 'text-yellow-500'
                          : 'text-red-500'
                    }
                  >
                    {recommendation.correlation.toFixed(2)}
                  </div>
                </TableCell>
                <TableCell>
                  <div
                    className={
                      recommendation.liquidityScore > 80
                        ? 'text-green-500'
                        : recommendation.liquidityScore > 60
                          ? 'text-yellow-500'
                          : 'text-red-500'
                    }
                  >
                    {recommendation.liquidityScore.toFixed(0)}/100
                  </div>
                </TableCell>
                <TableCell className="max-w-xs">
                  <div className="text-sm">{recommendation.reason}</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
