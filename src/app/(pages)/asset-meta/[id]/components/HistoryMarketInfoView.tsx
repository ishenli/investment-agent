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
import { AssetMarketInfoType } from '@/types/marketInfo';
import { useTranslation } from 'react-i18next';

interface HistoryMarketInfoViewProps {
  marketInfos: AssetMarketInfoType[];
  getSentimentColor: (sentiment: string) => string;
  getImportanceColor: (importance: string) => string;
  onViewDetail: (info: AssetMarketInfoType) => void;
  onDelete: (info: AssetMarketInfoType) => void;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  setPagination: React.Dispatch<
    React.SetStateAction<{
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }>
  >;
}

export function HistoryMarketInfoView({
  marketInfos,
  getSentimentColor,
  getImportanceColor,
  onViewDetail,
  onDelete,
  pagination,
  setPagination,
}: HistoryMarketInfoViewProps) {
  const { t } = useTranslation('asset-meta');
  
  if (marketInfos.length === 0) {
    return (
      <Alert>
        <AlertTitle>{t('detail.history.noData.title')}</AlertTitle>
        <AlertDescription>{t('detail.history.noData.description')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="grid gap-6">
        {marketInfos.map((info) => (
          <Card key={info.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{info.title}</CardTitle>
                  <CardDescription className="mt-2">
                    <span className="font-medium">{info.symbol}</span> |
                    <span className="ml-2">
                      {format(new Date(info.createdAt), 'yyyy年MM月dd日 HH:mm', {
                        locale: zhCN,
                      })}
                    </span>
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge className={getSentimentColor(info.sentiment)}>{info.sentiment}</Badge>
                  <Badge className={getImportanceColor(info.importance)}>
                    重要性: {info.importance}/10
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {info.contentMode === 'original' ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                      {info.originalContent?.substring(0, 100) + '...'}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                      {info.summary}
                    </p>
                  )}
                </div>
                <Badge variant="secondary" className="ml-2 self-start">
                  {info.contentMode === 'original' 
                    ? t('detail.history.contentMode.original') 
                    : t('detail.history.contentMode.aiSummary')}
                </Badge>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => onViewDetail(info)}>
                  {t('detail.history.actions.viewDetail')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => onDelete(info)}>
                  {t('detail.history.actions.deleteDetail')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 分页控件 */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {t('detail.history.pagination.pageInfo', { 
              page: pagination.page, 
              totalPages: pagination.totalPages 
            })}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
              }
              disabled={pagination.page === 1}
            >
              {t('detail.history.pagination.previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination((prev) => ({
                  ...prev,
                  page: Math.min(prev.totalPages, prev.page + 1),
                }))
              }
              disabled={pagination.page === pagination.totalPages}
            >
              {t('detail.history.pagination.next')}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
