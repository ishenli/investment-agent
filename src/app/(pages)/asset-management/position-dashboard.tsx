/* eslint-disable @next/next/no-img-element */
'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@renderer/components/ui/table';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import { Badge } from '@renderer/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@renderer/components/ui/tabs';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  SearchIcon,
  FilterIcon,
  AlertTriangleIcon,
  PencilIcon,
  InfoIcon,
} from 'lucide-react';
import { usePositionsQuery } from '@renderer/hooks/useAssetQueries';
import { usePositionStore } from '@renderer/store/position/store';
import { EditPositionDialog } from './components/EditPositionDialog';
import { PositionType } from '@typings/position';
import { Skeleton } from '@renderer/components/ui/skeleton';
import Link from 'next/link';
import { marketToChinese } from '@/shared';
import { useTranslation } from 'react-i18next';
import { useExchangeRates } from '@/app/hooks/useExchangeRates';

// 辅助函数：格式化价格显示
const formatPrice = (price: number, currencySymbol: string, rate: number) => {
  return `${currencySymbol}${(price * rate).toFixed(2)}`;
};

// 辅助函数：格式化市值/收益整数显示
const formatValueWhole = (value: number, currencySymbol: string, rate: number) => {
  return `${currencySymbol}${Math.round(value * rate).toLocaleString()}`;
};

// 获取持仓的显示货币信息（CNY 持仓直接用人民币，无需二次转换）
const getPositionCurrency = (position: PositionType, filterCurrency: { symbol: string; rate: number }) => {
  if (position.currency === 'CNY') {
    return { symbol: '¥', rate: 1 };
  }
  return filterCurrency;
};

// 定义排序配置类型
type SortConfig = {
  key: keyof PositionType | null;
  direction: 'ascending' | 'descending';
};

export function PositionManagement() {
  const { t } = useTranslation('asset-management');
  const [activeTab, setActiveTab] = useState('stock');
  const [isEditPositionOpen, setIsEditPositionOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<PositionType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [fundSearchTerm, setFundSearchTerm] = useState('');
  const [filterMarket, setFilterMarket] = useState('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'ascending' });
  const [fundSortConfig, setFundSortConfig] = useState<SortConfig>({ key: null, direction: 'ascending' });

  // 获取动态汇率
  const { getRate } = useExchangeRates();

  // 根据市场筛选条件获取货币信息（使用动态汇率）
  const currency = (() => {
    if (filterMarket === '港股' || filterMarket === 'HK') {
      const rate = getRate('HKD', 'USD') || 0.13;
      return { symbol: 'HK$', rate: 1 / rate, currency: 'HKD' }; // USD -> HKD
    }
    if (filterMarket === 'A股' || filterMarket === 'CN') {
      const rate = getRate('CNY', 'USD') || 0.14;
      return { symbol: '¥', rate: 1 / rate, currency: 'CNY' }; // USD -> CNY
    }
    return { symbol: '$', rate: 1, currency: 'USD' };
  })();

  const { data: positions = [], isLoading, isError, refetch } = usePositionsQuery();
  const { alerts } = usePositionStore();

  // 按资产类型分组：股票 vs 基金
  const stockPositions = positions.filter((p) => (p.sector || 'stock') !== 'fund');
  const fundPositions = positions.filter((p) => p.sector === 'fund');

  const handleSort = (key: keyof PositionType) => {
    if (activeTab === 'fund') {
      setFundSortConfig((prev) => ({
        key,
        direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending',
      }));
    } else {
      setSortConfig((prev) => ({
        key,
        direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending',
      }));
    }
  };

  const getSortIcon = (columnKey: keyof PositionType, config: SortConfig = sortConfig) => {
    if (config.key !== columnKey) {
      return <ArrowUpIcon className="ml-1 h-4 w-4 text-gray-400" />;
    }
    return config.direction === 'ascending' ? (
      <ArrowUpIcon className="ml-1 h-4 w-4" />
    ) : (
      <ArrowDownIcon className="ml-1 h-4 w-4" />
    );
  };

  const applySort = (list: (PositionType & { detailUrl?: string })[], config: SortConfig) => {
    if (!config.key) return list;
    return [...list].sort((a, b) => {
      const aValue = a[config.key!];
      const bValue = b[config.key!];
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;
      if (aValue < bValue) return config.direction === 'ascending' ? -1 : 1;
      if (aValue > bValue) return config.direction === 'ascending' ? 1 : -1;
      return 0;
    });
  };

  // 股票列表：搜索 + 市场筛选 + 排序
  const filteredStockPositions = applySort(
    stockPositions
      .map((position) => ({
        ...position,
        detailUrl:
          position.market === 'US'
            ? `https://www.futunn.com/stock/${position.symbol.toUpperCase()}-US`
            : `https://www.futunn.com/stock/${position.symbol}-${position.market}`,
      }))
      .filter((position) => {
        const matchesSearch = position.symbol.toLowerCase().includes(searchTerm.toLowerCase());
        let matchesFilter = true;
        if (filterMarket !== 'all') {
          if (filterMarket === '美股') {
            matchesFilter = position.market === 'US' || (!position.market && !position.symbol.endsWith('.SZ'));
          } else if (filterMarket === 'A股') {
            matchesFilter = position.market === 'CN' || (!position.market && position.symbol.endsWith('.SZ'));
          } else if (filterMarket === '港股') {
            matchesFilter = position.market === 'HK';
          }
        }
        return matchesSearch && matchesFilter;
      }),
    sortConfig,
  );

  // 基金列表：搜索 + 排序
  const filteredFundPositions = applySort(
    fundPositions.filter((p) =>
      p.symbol.toLowerCase().includes(fundSearchTerm.toLowerCase()) ||
      (p.chineseName && p.chineseName.includes(fundSearchTerm))
    ),
    fundSortConfig,
  );

  const handleEditPosition = (position: PositionType) => {
    setSelectedPosition(position);
    setIsEditPositionOpen(true);
  };

  const stockTotalMarketValue = filteredStockPositions.reduce((sum, p) => sum + p.marketValue, 0);
  const stockTotalGain = filteredStockPositions.reduce((sum, p) => sum + p.unrealizedPnL, 0);

  const fundTotalMarketValue = filteredFundPositions.reduce((sum, p) => sum + p.marketValue, 0);
  const fundTotalGain = filteredFundPositions.reduce((sum, p) => sum + p.unrealizedPnL, 0);

  const handleUpdatePositions = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-9 w-48 mb-4" />
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-500">{t('error.title')}</CardTitle>
            <CardDescription>{t('error.description')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <TabsList>
                <TabsTrigger value="stock">
                  {t('tab.stock')}
                  {stockPositions.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">{stockPositions.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="fund">
                  {t('tab.fund')}
                  {fundPositions.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">{fundPositions.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>

          {/* ===== 股票持仓 Tab ===== */}
          <TabsContent value="stock">
            <CardHeader className="pt-0">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">{t('totalValue')}:</span>
                    <span className="text-lg font-bold">{formatValueWhole(stockTotalMarketValue, currency.symbol, currency.rate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">{t('totalGain')}:</span>
                    <span className={`text-lg font-bold ${stockTotalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatValueWhole(stockTotalGain, currency.symbol, currency.rate)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative">
                    <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('search.placeholder')}
                      className="pl-8 w-full md:w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={filterMarket} onValueChange={setFilterMarket}>
                    <SelectTrigger className="w-full md:w-36">
                      <FilterIcon className="h-4 w-4 mr-2" />
                      <SelectValue placeholder={t('filter.market')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('filter.all')}</SelectItem>
                      <SelectItem value="美股">{t('filter.us')}</SelectItem>
                      <SelectItem value="港股">{t('filter.hk')}</SelectItem>
                      <SelectItem value="A股">{t('filter.cn')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={filterMarket} onValueChange={setFilterMarket}>
                  <SelectTrigger className="w-full md:w-40">
                    <FilterIcon className="h-4 w-4 mr-2" />
                    <SelectValue placeholder={t('filter.market')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('filter.all')}</SelectItem>
                    <SelectItem value="美股">{t('filter.us')}</SelectItem>
                    <SelectItem value="港股">{t('filter.hk')}</SelectItem>
                    <SelectItem value="A股">{t('filter.cn')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {positions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{t('noData')}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => handleSort('symbol')}
                      >
                        <div className="flex items-center">
                          {t('table.symbol')}
                          {getSortIcon('symbol')}
                        </div>
                      </TableHead>
                      <TableHead className="hover:bg-gray-100 dark:hover:bg-gray-800">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs">{t('table.holdingInfo')}</span>
                          <div className="flex items-center gap-2">
                            <button
                              className="flex items-center text-xs hover:text-foreground text-muted-foreground"
                              onClick={() => handleSort('marketValue')}
                            >
                              {t('table.marketValue')}
                              {getSortIcon('marketValue')}
                            </button>
                            <span className="text-muted-foreground">/</span>
                            <button
                              className="flex items-center text-xs hover:text-foreground text-muted-foreground"
                              onClick={() => handleSort('quantity')}
                            >
                              {t('table.quantity')}
                              {getSortIcon('quantity')}
                            </button>
                          </div>
                        </div>
                      </TableHead>
                      <TableHead className="hover:bg-gray-100 dark:hover:bg-gray-800">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs">{t('table.priceInfo')}</span>
                          <div className="flex items-center gap-2">
                            <button
                              className="flex items-center text-xs hover:text-foreground text-muted-foreground"
                              onClick={() => handleSort('currentPrice')}
                            >
                              {t('table.currentPrice')}
                              {getSortIcon('currentPrice')}
                            </button>
                            <span className="text-muted-foreground">/</span>
                            <button
                              className="flex items-center text-xs hover:text-foreground text-muted-foreground"
                              onClick={() => handleSort('averageCost')}
                            >
                              {t('table.averageCost')}
                              {getSortIcon('averageCost')}
                            </button>
                          </div>
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => handleSort('unrealizedPnL')}
                      >
                        <div className="flex items-center">
                          {t('table.unrealizedPnL')}
                          {getSortIcon('unrealizedPnL')}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => handleSort('positionRatio')}
                      >
                        <div className="flex items-center">
                          {t('table.positionRatio')}
                          {getSortIcon('positionRatio')}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => handleSort('market')}
                      >
                        <div className="flex items-center">
                          {t('table.market')}
                          {getSortIcon('market')}
                        </div>
                      </TableHead>
                      <TableHead>{t('table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFundPositions.map((position) => (
                      <TableRow key={position.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3 min-w-0">
                            {position.logoUrl ? (
                              <div className="shrink-0 w-10 h-10 rounded-lg overflow-hidden border bg-white flex items-center justify-center shadow-sm">
                                <img
                                  src={position.logoUrl}
                                  alt={`${position.symbol} logo`}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    // 图片加载失败时显示占位符
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    const parent = (e.target as HTMLImageElement).parentElement;
                                    if (parent) {
                                      parent.innerHTML = `<div class="w-full h-full bg-muted flex items-center justify-center text-xs font-medium">${position.symbol}</div>`;
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="shrink-0 w-10 h-10 rounded-lg border bg-muted flex items-center justify-center shadow-sm">
                                <span className="text-xs text-muted-foreground font-medium">{position.symbol}</span>
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-foreground truncate">
                                <Link
                                  href={position.detailUrl as string}
                                  target="_blank"
                                  className="hover:text-blue-600 transition-colors"
                                >
                                  {position.symbol}
                                </Link>
                              </div>
                              {position.chineseName && (
                                <div className="text-sm text-muted-foreground truncate mt-0.5">
                                  {position.chineseName}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">
                              {formatValueWhole(position.marketValue, currency.symbol, currency.rate)}
                            </span>
                            <span className="text-xs text-muted-foreground">{position.quantity}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={
                                position.currentPrice > position.averageCost
                                  ? 'text-green-500 font-medium'
                                  : position.currentPrice < position.averageCost
                                    ? 'text-red-500 font-medium'
                                    : 'font-medium'
                              }
                            >
                              {formatPrice(position.currentPrice, currency.symbol, currency.rate)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatPrice(position.averageCost, currency.symbol, currency.rate)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {position.unrealizedPnL >= 0 ? (
                              <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
                            ) : (
                              <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
                            )}
                            <span
                              className={
                                position.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'
                              }
                            >
                              {formatValueWhole(Math.abs(position.unrealizedPnL), currency.symbol, currency.rate)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {position.positionRatio !== undefined ? (
                            <span>{(position.positionRatio * 100).toFixed(2)}%</span>
                          ) : (
                            <span>N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={position.market === 'HK' ? 'secondary' : 'default'}>
                            {marketToChinese(position.market)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon-sm"
                              onClick={() => handleEditPosition(position)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            {position.assetMetaId && (
                              <Link href={`/asset-meta/${position.assetMetaId}`}>
                                <Button variant="outline" size="icon-sm">
                                  <InfoIcon className="h-4 w-4" />
                                </Button>
                              </Link>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>

            <CardContent>
              {filteredStockPositions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{t('noData')}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('symbol')}>
                        <div className="flex items-center">{t('table.symbol')}{getSortIcon('symbol')}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('market')}>
                        <div className="flex items-center">{t('table.market')}{getSortIcon('market')}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('quantity')}>
                        <div className="flex items-center">{t('table.quantity')}{getSortIcon('quantity')}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('averageCost')}>
                        <div className="flex items-center">{t('table.averageCost')}{getSortIcon('averageCost')}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('currentPrice')}>
                        <div className="flex items-center">{t('table.currentPrice')}{getSortIcon('currentPrice')}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('marketValue')}>
                        <div className="flex items-center">{t('table.marketValue')}{getSortIcon('marketValue')}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('unrealizedPnL')}>
                        <div className="flex items-center">{t('table.unrealizedPnL')}{getSortIcon('unrealizedPnL')}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('positionRatio')}>
                        <div className="flex items-center">{t('table.positionRatio')}{getSortIcon('positionRatio')}</div>
                      </TableHead>
                      <TableHead>{t('table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStockPositions.map((position) => {
                      const posCurrency = getPositionCurrency(position, currency);
                      return (
                        <TableRow key={position.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3 min-w-0">
                              {position.logoUrl ? (
                                <div className="shrink-0 w-10 h-10 rounded-lg overflow-hidden border bg-white flex items-center justify-center shadow-sm">
                                  <img
                                    src={position.logoUrl}
                                    alt={`${position.symbol} logo`}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      const parent = (e.target as HTMLImageElement).parentElement;
                                      if (parent) {
                                        parent.innerHTML = `<div class="w-full h-full bg-muted flex items-center justify-center text-xs font-medium">${position.symbol}</div>`;
                                      }
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="shrink-0 w-10 h-10 rounded-lg border bg-muted flex items-center justify-center shadow-sm">
                                  <span className="text-xs text-muted-foreground font-medium">{position.symbol}</span>
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-foreground truncate">
                                  <Link href={position.detailUrl || '#'} target="_blank" className="hover:text-blue-600 transition-colors">
                                    {position.symbol}
                                  </Link>
                                </div>
                                {position.chineseName && (
                                  <div className="text-sm text-muted-foreground truncate mt-0.5">{position.chineseName}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={position.market === 'HK' ? 'secondary' : 'default'}>
                              {marketToChinese(position.market)}
                            </Badge>
                          </TableCell>
                          <TableCell>{position.quantity}</TableCell>
                          <TableCell>
                            <span className={position.currentPrice > position.averageCost ? 'text-green-500' : position.currentPrice < position.averageCost ? 'text-red-500' : ''}>
                              {formatPrice(position.averageCost, posCurrency.symbol, posCurrency.rate)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={position.currentPrice > position.averageCost ? 'text-green-500' : position.currentPrice < position.averageCost ? 'text-red-500' : ''}>
                              {formatPrice(position.currentPrice, posCurrency.symbol, posCurrency.rate)}
                            </span>
                          </TableCell>
                          <TableCell>{formatValueWhole(position.marketValue, posCurrency.symbol, posCurrency.rate)}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {position.unrealizedPnL >= 0 ? (
                                <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
                              ) : (
                                <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
                              )}
                              <span className={position.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}>
                                {formatValueWhole(Math.abs(position.unrealizedPnL), posCurrency.symbol, posCurrency.rate)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {position.positionRatio !== undefined ? (
                              <span>{(position.positionRatio * 100).toFixed(2)}%</span>
                            ) : (
                              <span>N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="icon-sm" onClick={() => handleEditPosition(position)}>
                                <PencilIcon className="h-4 w-4" />
                              </Button>
                              {position.assetMetaId && (
                                <Link href={`/asset-meta/${position.assetMetaId}`}>
                                  <Button variant="outline" size="icon-sm">
                                    <InfoIcon className="h-4 w-4" />
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </TabsContent>

          {/* ===== 基金持仓 Tab ===== */}
          <TabsContent value="fund">
            <CardHeader className="pt-0">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">{t('fund.totalValue')}:</span>
                    <span className="text-lg font-bold">¥{Math.round(fundTotalMarketValue).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">{t('fund.totalGain')}:</span>
                    <span className={`text-lg font-bold ${fundTotalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ¥{Math.round(fundTotalGain).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('fund.search.placeholder')}
                    className="pl-8 w-full md:w-64"
                    value={fundSearchTerm}
                    onChange={(e) => setFundSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredFundPositions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{t('fund.noData')}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('symbol')}>
                        <div className="flex items-center">{t('fund.table.fundCode')}{getSortIcon('symbol', fundSortConfig)}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('quantity')}>
                        <div className="flex items-center">{t('fund.table.shares')}{getSortIcon('quantity', fundSortConfig)}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('averageCost')}>
                        <div className="flex items-center">{t('fund.table.avgNav')}{getSortIcon('averageCost', fundSortConfig)}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('currentPrice')}>
                        <div className="flex items-center">{t('fund.table.nav')}{getSortIcon('currentPrice', fundSortConfig)}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('marketValue')}>
                        <div className="flex items-center">{t('fund.table.marketValue')}{getSortIcon('marketValue', fundSortConfig)}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('unrealizedPnL')}>
                        <div className="flex items-center">{t('fund.table.unrealizedPnL')}{getSortIcon('unrealizedPnL', fundSortConfig)}</div>
                      </TableHead>
                      <TableHead>{t('fund.table.returnRate')}</TableHead>
                      <TableHead>{t('fund.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFundPositions.map((position) => {
                      const returnRate = position.averageCost > 0
                        ? ((position.currentPrice - position.averageCost) / position.averageCost) * 100
                        : 0;
                      return (
                        <TableRow key={position.id}>
                          <TableCell className="font-medium">
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground">{position.symbol}</div>
                              {position.chineseName && (
                                <div className="text-sm text-muted-foreground truncate mt-0.5">{position.chineseName}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{position.quantity.toFixed(2)}</TableCell>
                          <TableCell>¥{position.averageCost.toFixed(4)}</TableCell>
                          <TableCell>
                            <span className={position.currentPrice > position.averageCost ? 'text-green-500' : position.currentPrice < position.averageCost ? 'text-red-500' : ''}>
                              ¥{position.currentPrice.toFixed(4)}
                            </span>
                          </TableCell>
                          <TableCell>¥{Math.round(position.marketValue).toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {position.unrealizedPnL >= 0 ? (
                                <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
                              ) : (
                                <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
                              )}
                              <span className={position.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}>
                                ¥{Math.round(Math.abs(position.unrealizedPnL)).toLocaleString()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={returnRate >= 0 ? 'text-green-500' : 'text-red-500'}>
                              {returnRate >= 0 ? '+' : ''}{returnRate.toFixed(2)}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="icon-sm" onClick={() => handleEditPosition(position)}>
                                <PencilIcon className="h-4 w-4" />
                              </Button>
                              {position.assetMetaId && (
                                <Link href={`/asset-meta/${position.assetMetaId}`}>
                                  <Button variant="outline" size="icon-sm">
                                    <InfoIcon className="h-4 w-4" />
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </TabsContent>
        </Card>
      </Tabs>

      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('alerts.title')}</CardTitle>
            <CardDescription>{t('alerts.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  <AlertTriangleIcon
                    className={`h-5 w-5 mt-0.5 ${alert.severity === 'high'
                      ? 'text-red-500'
                      : alert.severity === 'medium'
                        ? 'text-yellow-500'
                        : 'text-green-500'
                      }`}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{alert.message}</p>
                    <p className="text-sm text-muted-foreground">
                      {alert.timestamp.toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      alert.severity === 'high'
                        ? 'destructive'
                        : alert.severity === 'medium'
                          ? 'secondary'
                          : 'default'
                    }
                  >
                    {alert.severity === 'high' ? t('alerts.high') : alert.severity === 'medium' ? t('alerts.medium') : t('alerts.low')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <EditPositionDialog
        open={isEditPositionOpen}
        onOpenChange={setIsEditPositionOpen}
        position={selectedPosition}
        onUpdate={handleUpdatePositions}
      />
    </div>
  );
}
