'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import { Button } from '@renderer/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

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
  originalContent: string | null;
  contentMode: 'ai_summary' | 'original';
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
  const { t } = useTranslation('asset-meta');
  
  if (!marketInfo) {
    return (
      <Alert>
        <AlertTitle>{t('detail.latest.noData.title')}</AlertTitle>
        <AlertDescription>{t('detail.latest.noData.description')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">{marketInfo.title}</h2>
            <Badge variant={marketInfo.contentMode === 'original' ? 'secondary' : 'default'}>
              {marketInfo.contentMode === 'original' ? t('detail.latest.contentMode.original') : t('detail.latest.contentMode.aiSummary')}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2">
            {t('detail.latest.assetCode')}: {marketInfo.symbol} | {t('detail.latest.updateTime')}:{' '}
            {format(new Date(marketInfo.updatedAt), 'yyyy年MM月dd日 HH:mm', {
              locale: zhCN,
            })}
          </p>
        </div>
      </div>

      {marketInfo.contentMode === 'ai_summary' ? (
        // AI摘要模式显示
        <>
          <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="">
                <CardTitle className="text-sm font-medium">
                  {t('detail.latest.sentiment')}：
                  <Badge className={getSentimentColor(marketInfo.sentiment)}>
                    {marketInfo.sentiment}
                  </Badge>
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="">
                <CardTitle className="text-sm font-medium">
                  {t('detail.latest.importanceScore')}{' '}
                  <Badge className={getImportanceColor(marketInfo.importance)}>
                    {marketInfo.importance}/10
                  </Badge>
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>{t('detail.latest.marketImpact')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{marketInfo.marketImpact}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('detail.latest.contentSummary')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{marketInfo.summary}</p>
            </CardContent>
          </Card>

          {marketInfo.keyTopics && (
            <Card>
              <CardHeader>
                <CardTitle>{t('detail.latest.keyTopics')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{marketInfo.keyTopics}</p>
              </CardContent>
            </Card>
          )}

          {marketInfo.keyDataPoints && (
            <Card>
              <CardHeader>
                <CardTitle>{t('detail.latest.keyDataPoints')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{marketInfo.keyDataPoints}</p>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        // 原文模式显示
        <Card>
          <CardHeader>
            <CardTitle>{t('detail.latest.originalContent')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap">{marketInfo.originalContent}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {(marketInfo.sourceName || marketInfo.sourceUrl) && (
        <Card>
          <CardHeader>
            <CardTitle>{t('detail.latest.sourceInfo')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                {marketInfo.sourceName && <p className="text-sm">{t('detail.latest.sourceInfo')}: {marketInfo.sourceName}</p>}
              </div>
              {marketInfo.sourceUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={marketInfo.sourceUrl} target="_blank" rel="noopener noreferrer">
                    {t('detail.latest.viewOriginal')}
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
