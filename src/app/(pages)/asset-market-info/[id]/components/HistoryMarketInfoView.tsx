'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import { Button } from '@renderer/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { AssetMarketInfoType } from '@/types/marketInfo';

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
  setPagination: React.Dispatch<React.SetStateAction<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }>>;
}

export function HistoryMarketInfoView({
  marketInfos,
  getSentimentColor,
  getImportanceColor,
  onViewDetail,
  onDelete,
  pagination,
  setPagination
}: HistoryMarketInfoViewProps) {
  if (marketInfos.length === 0) {
    return (
      <Alert>
        <AlertTitle>暂无数据</AlertTitle>
        <AlertDescription>当前没有可用的资产市场信息历史记录。</AlertDescription>
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
                  <Badge className={getSentimentColor(info.sentiment)}>
                    {info.sentiment}
                  </Badge>
                  <Badge className={getImportanceColor(info.importance)}>
                    重要性: {info.importance}/10
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                {info.summary}
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetail(info)}
                >
                  查看详情
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(info)}
                >
                  删除详情
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
            第 {pagination.page} 页，共 {pagination.totalPages} 页
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
              上一页
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
              下一页
            </Button>
          </div>
        </div>
      )}
    </>
  );
}