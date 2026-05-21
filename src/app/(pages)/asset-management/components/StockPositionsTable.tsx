/* eslint-disable @next/next/no-img-element */
'use client';

import { useState } from 'react';
import {
  CardContent,
  CardHeader,
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
import {
  ArrowUpIcon,
  ArrowDownIcon,
  SearchIcon,
  FilterIcon,
  PencilIcon,
  EyeIcon,
  ExternalLinkIcon,
} from 'lucide-react';
import { PositionType } from '@typings/position';
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
const getPositionCurrency = (
  position: PositionType,
  filterCurrency: { symbol: string; rate: number },
) => {
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

interface StockPositionsTableProps {
  positions: PositionType[];
  onEditPosition: (position: PositionType) => void;
}

export function StockPositionsTable({ positions, onEditPosition }: StockPositionsTableProps) {
  const { t } = useTranslation('asset-management');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMarket, setFilterMarket] = useState('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'ascending' });

  // 获取动态汇率
  const { getRate } = useExchangeRates();

  // 根据市场筛选条件获取货币信息（使用动态汇率）
  const currency = (() => {
    if (filterMarket === '港股' || filterMarket === 'HK') {
      const rate = getRate('HKD', 'USD') || 0.13;
      return { symbol: 'HK$', rate: 1 / rate, currency: 'HKD' };
    }
    if (filterMarket === 'A股' || filterMarket === 'CN') {
      const rate = getRate('CNY', 'USD') || 0.14;
      return { symbol: '¥', rate: 1 / rate, currency: 'CNY' };
    }
    return { symbol: '$', rate: 1, currency: 'USD' };
  })();

  const handleSort = (key: keyof PositionType) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending',
    }));
  };

  const getSortIcon = (columnKey: keyof PositionType) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpIcon className="ml-1 h-4 w-4 text-gray-400" />;
    }
    return sortConfig.direction === 'ascending' ? (
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

  // 搜索 + 市场筛选 + 排序
  const filteredPositions = applySort(
    positions
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
            matchesFilter =
              position.market === 'US' || (!position.market && !position.symbol.endsWith('.SZ'));
          } else if (filterMarket === 'A股') {
            matchesFilter =
              position.market === 'CN' || (!position.market && position.symbol.endsWith('.SZ'));
          } else if (filterMarket === '港股') {
            matchesFilter = position.market === 'HK';
          }
        }
        return matchesSearch && matchesFilter;
      }),
    sortConfig,
  );

  const totalMarketValue = filteredPositions.reduce((sum, p) => sum + p.marketValue, 0);
  const totalGain = filteredPositions.reduce((sum, p) => sum + p.unrealizedPnL, 0);

  if (filteredPositions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">{t('noData')}</div>
    );
  }

  return (
    <>
      <CardHeader className="pt-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                {t('totalValue')}:
              </span>
              <span className="text-lg font-bold">
                {formatValueWhole(totalMarketValue, currency.symbol, currency.rate)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                {t('totalGain')}:
              </span>
              <span
                className={`text-lg font-bold ${totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {formatValueWhole(totalGain, currency.symbol, currency.rate)}
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
      </CardHeader>
      <CardContent>
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
            {filteredPositions.map((position) => {
              const posCurrency = getPositionCurrency(position, currency);
              return (
                <TableRow key={position.id}>
                  {/* Symbol */}
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
                          <span className="text-xs text-muted-foreground font-medium">
                            {position.symbol}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-foreground truncate">
                          <Link
                            href={position.detailUrl || '#'}
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

                  {/* 持仓信息：市值 / 数量 */}
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <div className="text-sm font-medium">
                        {formatValueWhole(
                          position.marketValue,
                          posCurrency.symbol,
                          posCurrency.rate,
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {position.quantity}
                      </div>
                    </div>
                  </TableCell>

                  {/* 价格信息：现价 / 成本价 */}
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <div
                        className={
                          position.currentPrice > position.averageCost
                            ? 'text-green-500'
                            : position.currentPrice < position.averageCost
                              ? 'text-red-500'
                              : ''
                        }
                      >
                        {formatPrice(
                          position.currentPrice,
                          posCurrency.symbol,
                          posCurrency.rate,
                        )}
                      </div>
                      <div
                        className={
                          position.currentPrice > position.averageCost
                            ? 'text-green-500'
                            : position.currentPrice < position.averageCost
                              ? 'text-red-500'
                              : ''
                        }
                      >
                        {formatPrice(
                          position.averageCost,
                          posCurrency.symbol,
                          posCurrency.rate,
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* 浮动盈亏 */}
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
                        {formatValueWhole(
                          Math.abs(position.unrealizedPnL),
                          posCurrency.symbol,
                          posCurrency.rate,
                        )}
                      </span>
                    </div>
                  </TableCell>

                  {/* 仓位比例 */}
                  <TableCell>
                    {position.positionRatio !== undefined ? (
                      <span>{(position.positionRatio * 100).toFixed(2)}%</span>
                    ) : (
                      <span>N/A</span>
                    )}
                  </TableCell>

                  {/* 市场 */}
                  <TableCell>
                    <Badge variant={position.market === 'HK' ? 'secondary' : 'default'}>
                      {marketToChinese(position.market)}
                    </Badge>
                  </TableCell>

              {/* 操作 */}
              <TableCell>
                <div className="flex gap-2">
                  {position.assetMetaId && (
                    <Link href={`/asset-meta/${position.assetMetaId}`}>
                      <Button variant="outline" size="icon-sm" title={t('actions.viewDetails')}>
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => onEditPosition(position)}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </>
  );
}
