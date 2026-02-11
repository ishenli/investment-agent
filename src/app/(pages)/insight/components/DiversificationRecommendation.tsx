'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
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
import { RotateCcwIcon } from 'lucide-react';

// 分散建议组件
export function DiversificationRecommendation() {
  const {
    data: recommendations,
    isLoading: isDiversificationLoading,
    refetch,
    isRefetching,
  } = useDiversificationRecommendationsQuery<RecommendationType[]>();

  const [loading, setLoading] = useState(false);

  // 手动触发刷新
  const handleRefresh = async () => {
    setLoading(true);
    try {
      await refetch();
    } finally {
      setLoading(false);
    }
  };

  if (isDiversificationLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">分散投资建议</CardTitle>
          <CardDescription>基于风险分析的投资组合优化建议</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Spinner />
            <p>正在加载中...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  // 如果没有建议，显示空状态
  if (!recommendations || recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">分散投资建议</CardTitle>
          <CardDescription>基于风险分析的投资组合优化建议</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">暂无分散投资建议</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg font-semibold">分散投资建议</CardTitle>
            <CardDescription>基于风险分析的投资组合优化建议</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            {loading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                刷新中...
              </>
            ) : (
              <>
                <RotateCcwIcon className="h-4 w-4 mr-2" />
                刷新
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>资产</TableHead>
              <TableHead>建议金额</TableHead>
              <TableHead>相关性</TableHead>
              <TableHead>流动性</TableHead>
              <TableHead>理由</TableHead>
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
