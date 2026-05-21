'use client';

import { useState } from 'react';
import {
  Card,
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
  ArrowUpIcon,
  ArrowDownIcon,
  SearchIcon,
  PencilIcon,
  EyeIcon,
} from 'lucide-react';
import { PositionType } from '@typings/position';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';

// 定义排序配置类型
type SortConfig = {
  key: keyof PositionType | null;
  direction: 'ascending' | 'descending';
};

interface FundPositionsTableProps {
  positions: PositionType[];
  onEditPosition: (position: PositionType) => void;
}

export function FundPositionsTable({ positions, onEditPosition }: FundPositionsTableProps) {
  const { t } = useTranslation('asset-management');
  const [searchTerm, setFundSearchTerm] = useState('');
  const [sortConfig, setFundSortConfig] = useState<SortConfig>({
    key: null,
    direction: 'ascending',
  });

  const handleSort = (key: keyof PositionType) => {
    setFundSortConfig((prev) => ({
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

  const applySort = (list: PositionType[], config: SortConfig) => {
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

  // 基金列表：搜索 + 排序
  const filteredPositions = applySort(
    positions.filter(
      (p) =>
        p.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.chineseName && p.chineseName.includes(searchTerm)),
    ),
    sortConfig,
  );

  const totalMarketValue = filteredPositions.reduce((sum, p) => sum + p.marketValue, 0);
  const totalGain = filteredPositions.reduce((sum, p) => sum + p.unrealizedPnL, 0);

  if (filteredPositions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">{t('fund.noData')}</div>
    );
  }

  return (
    <>
      <CardHeader className="pt-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                {t('fund.totalValue')}:
              </span>
              <span className="text-lg font-bold">
                ¥{Math.round(totalMarketValue).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                {t('fund.totalGain')}:
              </span>
              <span
                className={`text-lg font-bold ${totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                ¥{Math.round(totalGain).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('fund.search.placeholder')}
              className="pl-8 w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setFundSearchTerm(e.target.value)}
            />
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
                  {t('fund.table.fundCode')}
                  {getSortIcon('symbol')}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => handleSort('quantity')}
              >
                <div className="flex items-center">
                  {t('fund.table.shares')}
                  {getSortIcon('quantity')}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => handleSort('averageCost')}
              >
                <div className="flex items-center">
                  {t('fund.table.avgNav')}
                  {getSortIcon('averageCost')}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => handleSort('currentPrice')}
              >
                <div className="flex items-center">
                  {t('fund.table.nav')}
                  {getSortIcon('currentPrice')}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => handleSort('marketValue')}
              >
                <div className="flex items-center">
                  {t('fund.table.marketValue')}
                  {getSortIcon('marketValue')}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => handleSort('unrealizedPnL')}
              >
                <div className="flex items-center">
                  {t('fund.table.unrealizedPnL')}
                  {getSortIcon('unrealizedPnL')}
                </div>
              </TableHead>
              <TableHead>{t('fund.table.returnRate')}</TableHead>
              <TableHead>{t('fund.table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPositions.map((position) => {
              const returnRate =
                position.averageCost > 0
                  ? ((position.currentPrice - position.averageCost) /
                      position.averageCost) *
                    100
                  : 0;
              return (
                <TableRow key={position.id}>
                  <TableCell className="font-medium">
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground">{position.symbol}</div>
                      {position.chineseName && (
                        <div className="text-sm text-muted-foreground truncate mt-0.5">
                          {position.chineseName}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{position.quantity.toFixed(2)}</TableCell>
                  <TableCell>¥{position.averageCost.toFixed(4)}</TableCell>
                  <TableCell>
                    <span
                      className={
                        position.currentPrice > position.averageCost
                          ? 'text-green-500'
                          : position.currentPrice < position.averageCost
                            ? 'text-red-500'
                            : ''
                      }
                    >
                      ¥{position.currentPrice.toFixed(4)}
                    </span>
                  </TableCell>
                  <TableCell>
                    ¥{Math.round(position.marketValue).toLocaleString()}
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
                        ¥{Math.round(Math.abs(position.unrealizedPnL)).toLocaleString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={returnRate >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {returnRate >= 0 ? '+' : ''}
                      {returnRate.toFixed(2)}%
                    </span>
                  </TableCell>
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
