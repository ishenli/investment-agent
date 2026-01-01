'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import { LightbulbIcon, TrendingUpIcon, AlertTriangleIcon, RotateCcwIcon } from 'lucide-react';
import dayjs from 'dayjs';
import { Button } from '@renderer/components/ui/button';
import { Spinner } from '@renderer/components/ui/spinner';
import { useAIInsightsQuery } from '@renderer/hooks/usePositionQueries';
import { AIInsight } from '@renderer/store/position/aiInsightsTypes';

// AI洞察显示组件
export function AIInsightsDisplay() {
  const {
    data: aiInsights,
    isLoading: isAIInsightsLoading,
    refetch,
    isRefetching,
  } = useAIInsightsQuery();

  const [loading, setLoading] = useState(false);

  // 手动触发AI洞察请求
  const handleFetchAIInsights = async () => {
    setLoading(true);
    try {
      await refetch();
    } finally {
      setLoading(false);
    }
  };

  // 加载中状态
  if (isAIInsightsLoading || isRefetching) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">机会识别</CardTitle>
          <CardDescription>基于数据分析的智能洞察</CardDescription>
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

  // 如果没有洞察，显示空状态
  if (!aiInsights || aiInsights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">机会识别</CardTitle>
          <CardDescription>基于数据分析的智能洞察</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <LightbulbIcon className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <p>暂无分析结论</p>
            <Button
              className="mt-4 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              onClick={handleFetchAIInsights}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  分析中...
                </>
              ) : (
                '开始分析'
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
            <CardTitle className="text-lg font-semibold">机会识别</CardTitle>
            <CardDescription>基于 AI 大模型的数据分析的智能洞察</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleFetchAIInsights} disabled={loading}>
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
          {aiInsights.map((insight: AIInsight) => (
            <div key={insight.id} className="flex items-start gap-4 p-4 rounded-lg border">
              <div className="mt-0.5">
                {insight.type === 'opportunity' && (
                  <TrendingUpIcon className="h-5 w-5 text-green-500" />
                )}
                {insight.type === 'risk' && <AlertTriangleIcon className="h-5 w-5 text-red-500" />}
                {insight.type === 'suggestion' && (
                  <LightbulbIcon className="h-5 w-5 text-yellow-500" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm">{insight.title}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {insight.confidence.toFixed(0)}% 置信度
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {dayjs(insight.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
