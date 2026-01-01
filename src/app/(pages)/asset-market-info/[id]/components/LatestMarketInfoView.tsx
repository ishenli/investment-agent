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
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

type AssetMarketInfoType = {
  id: number;
  assetMetaIds: number[];
  title: string;
  symbol: string;
  sentiment: string;
  importance: string;
  summary: string;
  keyTopics: string | null;
  marketImpact: string;
  keyDataPoints: string | null;
  sourceUrl: string | null;
  sourceName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

interface LatestMarketInfoViewProps {
  marketInfo: AssetMarketInfoType | null;
  getSentimentColor: (sentiment: string) => string;
  getImportanceColor: (importance: string) => string;
}

export function LatestMarketInfoView({
  marketInfo,
  getSentimentColor,
  getImportanceColor,
}: LatestMarketInfoViewProps) {
  if (!marketInfo) {
    return (
      <Alert>
        <AlertTitle>未找到数据</AlertTitle>
        <AlertDescription>未找到该资产的市场信息。</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{marketInfo.title}</h2>
          <p className="text-muted-foreground mt-2">
            资产代码: {marketInfo.symbol} | 更新时间:{' '}
            {format(new Date(marketInfo.updatedAt), 'yyyy年MM月dd日 HH:mm', {
              locale: zhCN,
            })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="">
            <CardTitle className="text-sm font-medium">
              投资倾向：
              <Badge className={getSentimentColor(marketInfo.sentiment)}>
                {marketInfo.sentiment}
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="">
            <CardTitle className="text-sm font-medium">
              重要性评分{' '}
              <Badge className={getImportanceColor(marketInfo.importance)}>
                {marketInfo.importance}/10
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>市场影响</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{marketInfo.marketImpact}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>内容摘要</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{marketInfo.summary}</p>
        </CardContent>
      </Card>

      {marketInfo.keyTopics && (
        <Card>
          <CardHeader>
            <CardTitle>关键主题</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{marketInfo.keyTopics}</p>
          </CardContent>
        </Card>
      )}

      {marketInfo.keyDataPoints && (
        <Card>
          <CardHeader>
            <CardTitle>重要数据点</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{marketInfo.keyDataPoints}</p>
          </CardContent>
        </Card>
      )}

      {(marketInfo.sourceName || marketInfo.sourceUrl) && (
        <Card>
          <CardHeader>
            <CardTitle>来源信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                {marketInfo.sourceName && <p className="text-sm">来源: {marketInfo.sourceName}</p>}
              </div>
              {marketInfo.sourceUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={marketInfo.sourceUrl} target="_blank" rel="noopener noreferrer">
                    查看原文
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
