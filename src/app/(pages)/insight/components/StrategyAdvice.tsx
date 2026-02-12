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
import { LightbulbIcon, ThumbsUpIcon, ThumbsDownIcon } from 'lucide-react';
import { useStrategyAdviceQuery } from '@renderer/hooks/usePositionQueries';
import { Spinner } from '@renderer/components/ui/spinner';
import { AdviceType } from '@typings/insight';
import { RotateCcwIcon } from 'lucide-react';

// 策略建议组件
export function StrategyAdvice() {
  const { data: advice, isLoading: isStrategyAdviceLoading, refetch, isRefetching } =
    useStrategyAdviceQuery<AdviceType[]>();

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

  if (isStrategyAdviceLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">策略建议</CardTitle>
          <CardDescription>基于您投资组合的个性化策略建议</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Spinner />
            <p>正在分析中...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  // 如果没有建议，显示空状态
  if (!advice || advice.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">策略建议</CardTitle>
          <CardDescription>基于您投资组合的个性化策略建议</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">暂无策略建议</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg font-semibold">投资组合策略建议</CardTitle>
            <CardDescription>基于您投资组合的个性化策略建议</CardDescription>
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
        <div className="space-y-4">
          {advice.map((item) => (
            <div key={item.id} className="flex items-start gap-4 p-4 rounded-lg border">
              <LightbulbIcon className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-medium text-sm">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
