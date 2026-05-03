'use client';

import { useState } from 'react';
import { useSnapshots, useCreateSnapshot, useDeleteSnapshot, formatCentsToDollars, SnapshotRecord, computeSnapshotDiff } from '@/app/hooks/useSnapshot';
import { Button } from '@renderer/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@renderer/components/ui/alert-dialog';
import {
  Camera,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { notificationManager } from '@/app/lib/notification';
import { cn } from '@renderer/lib/utils';
import { useTranslation } from 'react-i18next';

// Source badge color mapping
const SOURCE_COLORS: Record<string, 'default' | 'secondary' | 'outline'> = {
  scheduled: 'default',
  manual: 'secondary',
  backfill: 'outline',
};



// Position detail component
function PositionDetail({ positions }: { positions: SnapshotRecord['positions'] }) {
  const { t } = useTranslation('snapshot');
  
  if (!positions || positions.positions.length === 0) {
    return <div className="text-muted-foreground text-sm">{t('positions.empty')}</div>;
  }

  const formatCents = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-muted-foreground mb-2">
        {t('positions.count')}: {positions.positionCount} | {t('positions.totalValue')}: {formatCents(positions.totalPositionsValueCents)}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">{t('positions.table.symbol')}</th>
              <th className="text-right py-2 px-2">{t('positions.table.quantity')}</th>
              <th className="text-right py-2 px-2">{t('positions.table.costPrice')}</th>
              <th className="text-right py-2 px-2">{t('positions.table.currentPrice')}</th>
              <th className="text-right py-2 px-2">{t('positions.table.marketValue')}</th>
              <th className="text-right py-2 px-2">{t('positions.table.pnl')}</th>
            </tr>
          </thead>
          <tbody>
            {positions.positions.map((pos, idx) => {
              const pnlPercent = pos.averagePriceCents > 0
                ? ((pos.currentPriceCents - pos.averagePriceCents) / pos.averagePriceCents) * 100
                : 0;
              const isProfit = pos.unrealizedGainLossCents >= 0;

              return (
                <tr key={idx} className="border-b last:border-0">
                  <td className="py-2 px-2 font-medium">{pos.symbol}</td>
                  <td className="text-right py-2 px-2">{pos.quantity}</td>
                  <td className="text-right py-2 px-2">{formatCents(pos.averagePriceCents)}</td>
                  <td className="text-right py-2 px-2">{formatCents(pos.currentPriceCents)}</td>
                  <td className="text-right py-2 px-2">{formatCents(pos.marketValueCents)}</td>
                  <td className={cn(
                    "text-right py-2 px-2",
                    isProfit ? "text-green-600" : "text-red-600"
                  )}>
                    {formatCents(pos.unrealizedGainLossCents)}
                    <span className="text-xs ml-1">({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Snapshot card component
function SnapshotCard({
  snapshot,
  prevSnapshot,
  onDelete,
}: {
  snapshot: SnapshotRecord;
  prevSnapshot?: SnapshotRecord;
  onDelete: (id: number) => void;
}) {
  const { t } = useTranslation('snapshot');
  const [expanded, setExpanded] = useState(false);

  const snapshotDate = new Date(snapshot.snapshotDate);
  const createdAt = new Date(snapshot.createdAt);

  const totalValue = snapshot.totalValueCents;
  const cashBalance = snapshot.cashBalanceCents;
  const positionValue = snapshot.positions.totalPositionsValueCents;

  const diff = prevSnapshot ? computeSnapshotDiff(snapshot, prevSnapshot) : null;

  const formatDiffCents = (cents: number) => {
    return formatCentsToDollars(Math.abs(cents)).replace('$', cents >= 0 ? '+$' : '-$');
  };
  const formatDiffPct = (pct: number) => {
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(2)}%`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {format(snapshotDate, 'yyyy-MM-dd')}
              </span>
            </div>
            <Badge variant={SOURCE_COLORS[snapshot.source]}>
              {t(`source.${snapshot.source}`) || snapshot.source}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  {t('collapse')}
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  {t('expand')}
                </>
              )}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('deleteConfirm.title')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('deleteConfirm.description', { date: format(snapshotDate, 'yyyy-MM-dd') })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('deleteConfirm.cancelButton')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(snapshot.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t('deleteConfirm.confirmButton')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{t('stats.totalValue')}</div>
            <div className="text-lg font-semibold flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              {formatCentsToDollars(totalValue)}
            </div>
            {diff && (
              <div className={cn(
                'text-xs flex items-center gap-0.5',
                diff.totalValueDiffCents >= 0 ? 'text-green-600' : 'text-red-500',
              )}>
                {diff.totalValueDiffCents >= 0
                  ? <TrendingUp className="h-3 w-3" />
                  : <TrendingDown className="h-3 w-3" />}
                <span>{formatDiffCents(diff.totalValueDiffCents)}</span>
                <span className="text-muted-foreground/70">({formatDiffPct(diff.totalValueDiffPct)})</span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{t('stats.positionValue')}</div>
            <div className="text-lg font-semibold">
              {formatCentsToDollars(positionValue)}
            </div>
            {diff && (
              <div className={cn(
                'text-xs flex items-center gap-0.5',
                diff.positionValueDiffCents >= 0 ? 'text-green-600' : 'text-red-500',
              )}>
                {diff.positionValueDiffCents >= 0
                  ? <TrendingUp className="h-3 w-3" />
                  : <TrendingDown className="h-3 w-3" />}
                <span>{formatDiffCents(diff.positionValueDiffCents)}</span>
                <span className="text-muted-foreground/70">({formatDiffPct(diff.positionValueDiffPct)})</span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{t('stats.cashBalance')}</div>
            <div className="text-lg font-semibold">
              {formatCentsToDollars(cashBalance)}
            </div>
            {diff && (
              <div className={cn(
                'text-xs flex items-center gap-0.5',
                diff.cashBalanceDiffCents >= 0 ? 'text-green-600' : 'text-red-500',
              )}>
                {diff.cashBalanceDiffCents >= 0
                  ? <TrendingUp className="h-3 w-3" />
                  : <TrendingDown className="h-3 w-3" />}
                <span>{formatDiffCents(diff.cashBalanceDiffCents)}</span>
                <span className="text-muted-foreground/70">({formatDiffPct(diff.cashBalanceDiffPct)})</span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{t('stats.positionCount')}</div>
            <div className="text-lg font-semibold flex items-center gap-1">
              <Package className="h-4 w-4 text-muted-foreground" />
              {snapshot.positions.positionCount}
            </div>
            {diff && diff.positionCountDiff !== 0 && (
              <div className={cn(
                'text-xs flex items-center gap-0.5',
                diff.positionCountDiff > 0 ? 'text-green-600' : 'text-red-500',
              )}>
                {diff.positionCountDiff > 0
                  ? <TrendingUp className="h-3 w-3" />
                  : <TrendingDown className="h-3 w-3" />}
                <span>{t('stats.positionCountDiff', { count: diff.positionCountDiff })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Expanded Position Details */}
        {expanded && (
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-3">{t('positions.detailsTitle')}</h4>
            <PositionDetail positions={snapshot.positions} />
          </div>
        )}

        {/* Footer */}
        <div className="text-xs text-muted-foreground flex items-center gap-1 pt-2">
          <Calendar className="h-3 w-3" />
          {t('createdOn', { date: format(createdAt, 'yyyy-MM-dd HH:mm') })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SnapshotPage() {
  const { t } = useTranslation('snapshot');
  const { data, isLoading, error, refetch } = useSnapshots();
  const createMutation = useCreateSnapshot();
  const deleteMutation = useDeleteSnapshot();

  const handleCreateSnapshot = async () => {
    try {
      await createMutation.mutateAsync({ source: 'manual' });
      notificationManager.toast({ title: t('toasts.createSuccess'), variant: 'success' });
    } catch (err) {
      notificationManager.toast({ title: t('toasts.createFailed', { message: err instanceof Error ? err.message : '未知错误' }), variant: 'error' });
    }
  };

  const handleDeleteSnapshot = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      notificationManager.toast({ title: t('toasts.deleteSuccess'), variant: 'success' });
    } catch (err) {
      notificationManager.toast({ title: t('toasts.deleteFailed', { message: err instanceof Error ? err.message : '未知错误' }), variant: 'error' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('loadingFailed.title')}</AlertTitle>
          <AlertDescription>
            {t('loadingFailed.description')}
          </AlertDescription>
        </Alert>
        <Button onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('retryButton')}
        </Button>
      </div>
    );
  }

  const snapshots = data?.items ?? [];

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Camera className="h-6 w-6" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('refreshButton')}
          </Button>
          <Button onClick={handleCreateSnapshot} disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {t('createButton')}
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">{t('stats.totalSnapshots')}</div>
            <div className="text-2xl font-bold">{data?.totalCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">{t('stats.earliestSnapshot')}</div>
            <div className="text-2xl font-bold">
              {snapshots.length > 0
                ? format(new Date(snapshots[snapshots.length - 1].snapshotDate), 'yyyy-MM-dd')
                : '-'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">{t('stats.latestSnapshot')}</div>
            <div className="text-2xl font-bold">
              {snapshots.length > 0
                ? format(new Date(snapshots[0].snapshotDate), 'yyyy-MM-dd')
                : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Snapshot List */}
      {snapshots.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">{t('emptyState.title')}</h3>
              <p className="text-muted-foreground mt-1">
                {t('emptyState.description')}
              </p>
              <Button onClick={handleCreateSnapshot} className="mt-4" disabled={createMutation.isPending}>
                <Plus className="mr-2 h-4 w-4" />
                {t('firstSnapshotButton')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {snapshots.map((snapshot, idx) => (
            <SnapshotCard
              key={snapshot.id}
              snapshot={snapshot}
              prevSnapshot={snapshots[idx + 1]}
              onDelete={handleDeleteSnapshot}
            />
          ))}
        </div>
      )}
    </div>
  );
}