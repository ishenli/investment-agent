'use client';

import { useState } from 'react';
import { useSnapshots, useCreateSnapshot, useDeleteSnapshot, formatCentsToDollars, SnapshotRecord } from '@/app/hooks/useSnapshot';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@renderer/components/ui/dialog';
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
import { toast } from 'sonner';
import { cn } from '@renderer/lib/utils';

// Source badge color mapping
const SOURCE_COLORS: Record<string, 'default' | 'secondary' | 'outline'> = {
  scheduled: 'default',
  manual: 'secondary',
  backfill: 'outline',
};

// Source display names
const SOURCE_DISPLAY_NAMES: Record<string, string> = {
  scheduled: '定时快照',
  manual: '手动快照',
  backfill: '回填快照',
};

// Position detail component
function PositionDetail({ positions }: { positions: SnapshotRecord['positions'] }) {
  if (!positions || positions.positions.length === 0) {
    return <div className="text-muted-foreground text-sm">无持仓记录</div>;
  }

  const formatCents = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-muted-foreground mb-2">
        持仓数量: {positions.positionCount} | 总市值: {formatCents(positions.totalPositionsValueCents)}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">股票</th>
              <th className="text-right py-2 px-2">数量</th>
              <th className="text-right py-2 px-2">成本价</th>
              <th className="text-right py-2 px-2">现价</th>
              <th className="text-right py-2 px-2">市值</th>
              <th className="text-right py-2 px-2">盈亏</th>
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
  onDelete,
}: {
  snapshot: SnapshotRecord;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const snapshotDate = new Date(snapshot.snapshotDate);
  const createdAt = new Date(snapshot.createdAt);

  const isProfit = snapshot.positions.totalPositionsValueCents > 0;
  const totalValue = snapshot.totalValueCents;
  const cashBalance = snapshot.cashBalanceCents;
  const positionValue = snapshot.positions.totalPositionsValueCents;

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
              {SOURCE_DISPLAY_NAMES[snapshot.source] || snapshot.source}
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
                  收起
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  详情
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
                  <AlertDialogTitle>确认删除?</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作无法撤销。将永久删除 {format(snapshotDate, 'yyyy-MM-dd')} 的快照记录。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(snapshot.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    确认删除
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
            <div className="text-xs text-muted-foreground">总市值</div>
            <div className="text-lg font-semibold flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              {formatCentsToDollars(totalValue)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">持仓市值</div>
            <div className="text-lg font-semibold">
              {formatCentsToDollars(positionValue)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">现金余额</div>
            <div className="text-lg font-semibold">
              {formatCentsToDollars(cashBalance)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">持仓数量</div>
            <div className="text-lg font-semibold flex items-center gap-1">
              <Package className="h-4 w-4 text-muted-foreground" />
              {snapshot.positions.positionCount}
            </div>
          </div>
        </div>

        {/* Benchmark Info */}
        {snapshot.benchmarkValueCents && (
          <div className="text-sm text-muted-foreground">
            基准 ({snapshot.benchmarkSymbol}): {formatCentsToDollars(snapshot.benchmarkValueCents)}
          </div>
        )}

        {/* Expanded Position Details */}
        {expanded && (
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-3">持仓详情</h4>
            <PositionDetail positions={snapshot.positions} />
          </div>
        )}

        {/* Footer */}
        <div className="text-xs text-muted-foreground flex items-center gap-1 pt-2">
          <Calendar className="h-3 w-3" />
          创建于 {format(createdAt, 'yyyy-MM-dd HH:mm')}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SnapshotPage() {
  const { data, isLoading, error, refetch } = useSnapshots();
  const createMutation = useCreateSnapshot();
  const deleteMutation = useDeleteSnapshot();

  const handleCreateSnapshot = async () => {
    try {
      await createMutation.mutateAsync({ source: 'manual' });
      toast.success('快照创建成功');
    } catch (err) {
      toast.error(`创建失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  };

  const handleDeleteSnapshot = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success('快照已删除');
    } catch (err) {
      toast.error(`删除失败: ${err instanceof Error ? err.message : '未知错误'}`);
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
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>
            无法加载快照数据，请稍后重试
          </AlertDescription>
        </Alert>
        <Button onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          重试
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
            投资组合快照
          </h1>
          <p className="text-muted-foreground mt-1">
            记录投资组合的历史状态，用于业绩分析和报告生成
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
          <Button onClick={handleCreateSnapshot} disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            创建快照
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">总快照数</div>
            <div className="text-2xl font-bold">{data?.totalCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">最早快照</div>
            <div className="text-2xl font-bold">
              {snapshots.length > 0
                ? format(new Date(snapshots[snapshots.length - 1].snapshotDate), 'yyyy-MM-dd')
                : '-'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">最新快照</div>
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
              <h3 className="text-lg font-medium">暂无快照数据</h3>
              <p className="text-muted-foreground mt-1">
                点击"创建快照"按钮记录当前投资组合状态
              </p>
              <Button onClick={handleCreateSnapshot} className="mt-4" disabled={createMutation.isPending}>
                <Plus className="mr-2 h-4 w-4" />
                创建第一个快照
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {snapshots.map((snapshot) => (
            <SnapshotCard
              key={snapshot.id}
              snapshot={snapshot}
              onDelete={handleDeleteSnapshot}
            />
          ))}
        </div>
      )}
    </div>
  );
}