'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert';
import { AlertCircle, RefreshCw, ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { Badge } from '@renderer/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import Link from 'next/link';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { AssetMarketInfoType } from '@/types/marketInfo';

export function AssetMarketInfoDetail({ marketInfoId }: { marketInfoId: number }) {
  const [marketInfo, setMarketInfo] = useState<AssetMarketInfoType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketInfoDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/asset/market-info/detail?id=${marketInfoId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '获取市场信息详情失败');
      }

      const result = await response.json();
      setMarketInfo(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketInfoDetail();
  }, [marketInfoId]);

  // 获取情感标签的颜色
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
      case '积极':
        return 'bg-green-100 text-green-800';
      case 'negative':
      case '消极':
        return 'bg-red-100 text-red-800';
      case 'neutral':
      case '中性':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取重要性标签的颜色
  const getImportanceColor = (importance: string) => {
    const importanceNum = parseInt(importance);
    if (importanceNum >= 8) return 'bg-red-100 text-red-800';
    if (importanceNum >= 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>错误</AlertTitle>
        <AlertDescription>
          {error}
          <div className="mt-4">
            <Button onClick={fetchMarketInfoDetail} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              重新加载
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (!marketInfo) {
    return (
      <Alert>
        <AlertTitle>暂无数据</AlertTitle>
        <AlertDescription>未找到指定的市场信息。</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <div className="flex items-center gap-4">
        <Button variant="outline" asChild>
          <Link href="/asset-market-info">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回列表
          </Link>
        </Button>
      </div>

      {/* 标题区域 */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{marketInfo.title}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className={getSentimentColor(marketInfo.sentiment)}>
            情感: {marketInfo.sentiment}
          </Badge>
          <Badge variant="outline" className={getImportanceColor(marketInfo.importance)}>
            重要性: {marketInfo.importance}/10
          </Badge>
          <span className="text-muted-foreground text-sm">
            发布时间: {format(new Date(marketInfo.createdAt), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
          </span>
        </div>
      </div>

      {/* 关联资产 */}
      {marketInfo.assetMetas && marketInfo.assetMetas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">关联资产</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {marketInfo.assetMetas.map((asset) => (
                <Link key={asset.id} href={`/asset-meta/${asset.id}`}>
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary/20 transition-colors"
                  >
                    {asset.chineseName || asset.symbol}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 摘要 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">摘要</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground whitespace-pre-wrap">{marketInfo.summary}</p>
        </CardContent>
      </Card>

      {/* 市场影响 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">市场影响</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground whitespace-pre-wrap">{marketInfo.marketImpact}</p>
        </CardContent>
      </Card>

      {/* 关键话题 */}
      {marketInfo.keyTopics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">关键话题</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{marketInfo.keyTopics}</p>
          </CardContent>
        </Card>
      )}

      {/* 关键数据点 */}
      {marketInfo.keyDataPoints && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">关键数据点</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{marketInfo.keyDataPoints}</p>
          </CardContent>
        </Card>
      )}

      {/* 原始内容（原文保留模式） */}
      {marketInfo.originalContent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">原始内容</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{marketInfo.originalContent}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 来源信息 */}
      {(marketInfo.sourceName || marketInfo.sourceUrl) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">信息来源</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {marketInfo.sourceName && (
              <p className="text-sm">
                <span className="font-medium">来源名称:</span> {marketInfo.sourceName}
              </p>
            )}
            {marketInfo.sourceUrl && (
              <p className="text-sm">
                <span className="font-medium">来源链接:</span>{' '}
                <a
                  href={marketInfo.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  {marketInfo.sourceUrl}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 元信息 */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>ID: {marketInfo.id}</span>
            <span>内容模式: {marketInfo.contentMode === 'ai_summary' ? 'AI摘要' : '原文保留'}</span>
            <span>
              更新时间: {format(new Date(marketInfo.updatedAt), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
