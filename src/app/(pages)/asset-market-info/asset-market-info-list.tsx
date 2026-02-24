'use client';

import { useState, useEffect } from 'react';
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
import { AlertCircle, RefreshCw, Calendar } from 'lucide-react';
// 导入下拉菜单组件
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import Link from 'next/link';
import { get } from '@renderer/lib/request';
import { AssetMarketInfoType } from '@/types/marketInfo';
import { useTranslation } from 'react-i18next';

export function AssetMarketInfoList() {
  const [marketInfos, setMarketInfos] = useState<AssetMarketInfoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'latest' | 'dateRange'>('latest');
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: subDays(new Date(), 7),
    end: new Date(),
  });
  const { t } = useTranslation('asset-market-info');

  const fetchMarketInfos = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, any> = { type: activeTab };

      if (activeTab === 'dateRange') {
        params.startDate = dateRange.start.toISOString();
        params.endDate = dateRange.end.toISOString();
      }

      const response = await get<{ data: { data: AssetMarketInfoType[] } }>(
        '/api/asset/market-info',
        { params },
      );

      setMarketInfos(response.data.data);

      // 不再需要获取 assetMeta 信息，因为它们已经包含在 assetMetas 字段中
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketInfos();
  }, [activeTab, dateRange]);

  // 获取情感标签的颜色
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
      case '积极':
        return 'bg-green-100 text-green-800';
      case 'negative':
      case '消极':
        return 'bg-gray-100 text-gray-800';
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
        <AlertTitle>{t('error.title')}</AlertTitle>
        <AlertDescription>
          {error}
          <div className="mt-4">
            <Button onClick={fetchMarketInfos} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('error.reload')}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end items-center">
        <Button asChild>
          <Link href="/asset-market-info-fetcher">{t('actions.addInfo')}</Link>
        </Button>
      </div>
      {/* 标签页切换 */}
      <div className="border-b">
        <nav className="-mb-px flex space-x-8">
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'latest'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('latest')}
          >
            {t('tabs.latest')}
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dateRange'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('dateRange')}
          >
            {t('tabs.dateRange')}
          </button>
        </nav>
      </div>

      {/* 时间范围选择器 */}
      {activeTab === 'dateRange' && (
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{t('dateRange.label')}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={format(dateRange.start, 'yyyy-MM-dd')}
              onChange={(e) =>
                setDateRange({
                  ...dateRange,
                  start: startOfDay(new Date(e.target.value)),
                })
              }
              className="border rounded p-2"
            />
            <span>{t('dateRange.to')}</span>
            <input
              type="date"
              value={format(dateRange.end, 'yyyy-MM-dd')}
              onChange={(e) =>
                setDateRange({
                  ...dateRange,
                  end: endOfDay(new Date(e.target.value)),
                })
              }
              className="border rounded p-2"
            />
          </div>
        </div>
      )}

      {/* 市场信息列表 */}
      {marketInfos.length === 0 ? (
        <Alert>
          <AlertTitle>{t('list.noData.title')}</AlertTitle>
          <AlertDescription>{t('list.noData.description')}</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6">
          {marketInfos.map((info) => {
            return (
              <Card key={info.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">
                        <Link
                          href={`/asset-market-info/detail/${info.id}`}
                          className="hover:text-primary hover:underline transition-colors"
                        >
                          {info.title}
                        </Link>
                      </CardTitle>
                      <CardDescription className="mt-2">
                        <span className="text-muted-foreground">
                          {format(new Date(info.createdAt), 'yyyy年MM月dd日 HH:mm', {
                            locale: zhCN,
                          })}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge
                        variant="outline"
                        className={getSentimentColor(info.sentiment) + ' text-center rounded-full'}
                      >
                        {info.sentiment}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={getImportanceColor(info.importance) + ' text-center rounded-full'}
                      >
                        {t('importance')} {info.importance}/10
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {info.summary}
                  </p>
                </CardContent>
                {/* 在卡片底部添加公司标签 */}
                <div className="px-6 pb-4">
                  <div className="flex flex-wrap gap-2">
                    {info.assetMetas &&
                      info.assetMetas.map((assetMeta) => {
                        const displayName = assetMeta.chineseName || assetMeta.symbol;
                        // 根据资产符号或名称生成颜色类
                        const getColorClass = (symbol: string) => {
                          const colors = [
                            'bg-blue-100 text-blue-800 hover:bg-blue-200',
                            'bg-green-100 text-green-800 hover:bg-green-200',
                            'bg-purple-100 text-purple-800 hover:bg-purple-200',
                            'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
                            'bg-pink-100 text-pink-800 hover:bg-pink-200',
                            'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
                          ];
                          // 使用简单的哈希函数基于符号确定颜色
                          let hash = 0;
                          for (let i = 0; i < symbol.length; i++) {
                            hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
                          }
                          const index = Math.abs(hash) % colors.length;
                          return colors[index];
                        };

                        return (
                          <Link key={assetMeta.id} href={`/asset-meta/${assetMeta.id}`}>
                            <Badge
                              variant="secondary"
                              className={`cursor-pointer rounded-full hover:underline ${getColorClass(assetMeta.symbol)}`}
                            >
                              {displayName}
                            </Badge>
                          </Link>
                        );
                      })}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
