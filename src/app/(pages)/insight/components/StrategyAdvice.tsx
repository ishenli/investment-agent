'use client';

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

// 策略建议组件
export function StrategyAdvice() {
  const { data: advice, isLoading: isStrategyAdviceLoading } =
    useStrategyAdviceQuery<AdviceType[]>();

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
            <p>正在加载中...</p>
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
        <CardTitle className="text-lg font-semibold">投资组合策略建议</CardTitle>
        <CardDescription>基于您投资组合的个性化策略建议</CardDescription>
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
