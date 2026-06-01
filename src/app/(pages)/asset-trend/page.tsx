'use client';

import { useMemo, useState } from 'react';
import { useSnapshots, computeSnapshotDiff } from '@/app/hooks/useSnapshot';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Button } from '@renderer/components/ui/button';
import { ArrowLeft, Camera, TrendingUp, TrendingDown, DollarSign, Wallet, BarChart3 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { cn } from '@renderer/lib/utils';
import { formatCurrency } from '@renderer/lib/utils';
import { BalanceTrendChart } from './components/BalanceTrendChart';
import { CurrencySwitcher, type DisplayCurrency } from '@/app/(pages)/asset/components/asset-dashboard';
import { USD_TO_CNY } from '@/shared/constant';
import Link from 'next/link';

type TimePeriod = '7D' | '30D' | '90D' | '1Y' | 'ALL';

const PERIOD_LABEL_KEYS: Record<TimePeriod, string> = {
  '7D': 'period7D',
  '30D': 'period30D',
  '90D': 'period90D',
  '1Y': 'period1Y',
  'ALL': 'periodAll',
};

function getStartDate(period: TimePeriod): string | undefined {
  if (period === 'ALL') return undefined;
  const now = new Date();
  const daysMap: Record<Exclude<TimePeriod, 'ALL'>, number> = {
    '7D': 7,
    '30D': 30,
    '90D': 90,
    '1Y': 365,
  };
  now.setDate(now.getDate() - daysMap[period]);
  return now.toISOString().split('T')[0];
}

/** Convert USD cents to display currency amount */
function convertCents(cents: number, displayCurrency: DisplayCurrency): number {
  const value = cents / 100;
  if (displayCurrency === 'CNY') return value * USD_TO_CNY;
  return value;
}

/** Format a USD-cents value into the display currency string */
function fmtCents(cents: number, displayCurrency: DisplayCurrency): string {
  const value = convertCents(cents, displayCurrency);
  const code = displayCurrency === 'CNY' ? 'CNY' : 'USD';
  const locale = displayCurrency === 'CNY' ? 'zh-CN' : 'en-US';
  return formatCurrency(value, code, locale);
}

export default function AssetTrendPage() {
  const { t } = useTranslation('asset-trend');
  const router = useRouter();
  const [period, setPeriod] = useState<TimePeriod>('30D');
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>('USD');

  const startDate = getStartDate(period);
  const { data, isLoading } = useSnapshots(startDate, undefined, 500);

  const snapshots = data?.items ?? [];

  const periodDiff = useMemo(() => {
    if (snapshots.length < 2) return null;
    const latest = snapshots[0];
    const earliest = snapshots[snapshots.length - 1];
    return computeSnapshotDiff(latest, earliest);
  }, [snapshots]);

  const latestSnapshot = snapshots[0] ?? null;

  const periods: TimePeriod[] = ['7D', '30D', '90D', '1Y', 'ALL'];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button className="cursor-pointer" variant="ghost" size="icon" onClick={() => router.push('/asset')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-muted-foreground text-sm mt-0.5">{t('subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Currency switcher */}
          <CurrencySwitcher value={displayCurrency} onChange={setDisplayCurrency} />

          {/* Time period selector */}
          <div className="inline-flex items-center rounded-lg border bg-muted p-0.5">
            {periods.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  period === p
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t(PERIOD_LABEL_KEYS[p] as any)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {snapshots.length === 0 ? (
        /* Empty state */
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">{t('emptyState.title')}</h3>
              <p className="text-muted-foreground mt-1">{t('emptyState.description')}</p>
              <Button asChild className="mt-4">
                <Link href="/snapshot">{t('emptyState.goToSnapshot')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  {t('stats.currentTotal')}
                </div>
                <div className="text-xl font-bold">
                  {latestSnapshot ? fmtCents(latestSnapshot.totalValueCents, displayCurrency) : '-'}
                </div>
                {periodDiff && (
                  <div className={cn(
                    'text-xs flex items-center gap-0.5 mt-1',
                    periodDiff.totalValueDiffCents >= 0 ? 'text-green-600' : 'text-red-500',
                  )}>
                    {periodDiff.totalValueDiffCents >= 0
                      ? <TrendingUp className="h-3 w-3" />
                      : <TrendingDown className="h-3 w-3" />}
                    <span>
                      {periodDiff.totalValueDiffCents >= 0 ? '+' : ''}
                      {fmtCents(periodDiff.totalValueDiffCents, displayCurrency)}
                    </span>
                    <span className="text-muted-foreground/70">
                      ({periodDiff.totalValueDiffPct >= 0 ? '+' : ''}{periodDiff.totalValueDiffPct.toFixed(2)}%)
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Wallet className="h-3.5 w-3.5" />
                  {t('stats.cashBalance')}
                </div>
                <div className="text-xl font-bold">
                  {latestSnapshot ? fmtCents(latestSnapshot.cashBalanceCents, displayCurrency) : '-'}
                </div>
                {periodDiff && (
                  <div className={cn(
                    'text-xs flex items-center gap-0.5 mt-1',
                    periodDiff.cashBalanceDiffCents >= 0 ? 'text-green-600' : 'text-red-500',
                  )}>
                    {periodDiff.cashBalanceDiffCents >= 0
                      ? <TrendingUp className="h-3 w-3" />
                      : <TrendingDown className="h-3 w-3" />}
                    <span>
                      {periodDiff.cashBalanceDiffCents >= 0 ? '+' : ''}
                      {fmtCents(periodDiff.cashBalanceDiffCents, displayCurrency)}
                    </span>
                    <span className="text-muted-foreground/70">
                      ({periodDiff.cashBalanceDiffPct >= 0 ? '+' : ''}{periodDiff.cashBalanceDiffPct.toFixed(2)}%)
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <BarChart3 className="h-3.5 w-3.5" />
                  {t('stats.positionValue')}
                </div>
                <div className="text-xl font-bold">
                  {latestSnapshot ? fmtCents(latestSnapshot.positions.totalPositionsValueCents, displayCurrency) : '-'}
                </div>
                {periodDiff && (
                  <div className={cn(
                    'text-xs flex items-center gap-0.5 mt-1',
                    periodDiff.positionValueDiffCents >= 0 ? 'text-green-600' : 'text-red-500',
                  )}>
                    {periodDiff.positionValueDiffCents >= 0
                      ? <TrendingUp className="h-3 w-3" />
                      : <TrendingDown className="h-3 w-3" />}
                    <span>
                      {periodDiff.positionValueDiffCents >= 0 ? '+' : ''}
                      {fmtCents(periodDiff.positionValueDiffCents, displayCurrency)}
                    </span>
                    <span className="text-muted-foreground/70">
                      ({periodDiff.positionValueDiffPct >= 0 ? '+' : ''}{periodDiff.positionValueDiffPct.toFixed(2)}%)
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {t('stats.periodChange')}
                </div>
                <div className={cn(
                  'text-xl font-bold',
                  periodDiff
                    ? periodDiff.totalValueDiffPct >= 0 ? 'text-green-600' : 'text-red-500'
                    : '',
                )}>
                  {periodDiff
                    ? `${periodDiff.totalValueDiffPct >= 0 ? '+' : ''}${periodDiff.totalValueDiffPct.toFixed(2)}%`
                    : '-'}
                </div>
                {periodDiff && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {snapshots.length} snapshots
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>{t('chart.title')}</CardTitle>
              <CardDescription>{t('chart.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <BalanceTrendChart snapshots={snapshots} displayCurrency={displayCurrency} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
