'use client';

import { useState, useRef } from 'react';
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
import { AddTransactionDialog } from '@renderer/components/add-transaction-dialog';
import { EditPositionDialog } from './components/EditPositionDialog';
import { PositionType } from '@typings/position';
import { Skeleton } from '@renderer/components/ui/skeleton';
import Link from 'next/link';
import { marketToChinese } from '@/shared';

// 定义排序配置类型
type SortConfig = {
  key: keyof PositionType | null;
  direction: 'ascending' | 'descending';
};

export function PositionManagement() {
  const [isEditPositionOpen, setIsEditPositionOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<PositionType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMarket, setFilterMarket] = useState('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'ascending' });
  // 使用React Query获取持仓数据
  const { data: positions = [], isLoading, isError, refetch } = usePositionsQuery();
  const { alerts } = usePositionStore();

  // 处理排序
  const handleSort = (key: keyof PositionType) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // 获取排序图标
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

  const filteredPositions = [...positions]
    .map(position => {
      // 根据不同的股票地址，添加股票的详情地址
      // 美股是 https://www.futunn.com/stock/AAPL-US
      // A股是 https://www.futunn.com/stock/000001-CN
      // 港股是 https://www.futunn.com/stock/000001-HK
      return {
        ...position,
        detailUrl: position.market === 'US' ? `https://www.futunn.com/stock/${position.symbol.toUpperCase()}-US` : `https://www.futunn.com/stock/${position.symbol}-${position.market}`,
      };
    })
    .filter((position) => {
      const matchesSearch = position.symbol.toLowerCase().includes(searchTerm.toLowerCase());

      // 修复市场筛选逻辑
      // 当选择"全部市场"时显示所有数据
      // 当选择特定市场时，只显示该市场的数据
      let matchesFilter = true;
      if (filterMarket !== 'all') {
        if (filterMarket === '美股') {
          // 美股: market为'US'或不以'.SZ'结尾的股票
          matchesFilter =
            position.market === 'US' || (!position.market && !position.symbol.endsWith('.SZ'));
        } else if (filterMarket === 'A股') {
          // A股: market为'CN'或以'.SZ'结尾的股票
          matchesFilter =
            position.market === 'CN' || (!position.market && position.symbol.endsWith('.SZ'));
        } else if (filterMarket === '港股') {
          // 港股: market为'HK'
          matchesFilter = position.market === 'HK';
        }
      }

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortConfig.key === null) return 0;

      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      // 处理可能未定义或为空的值
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });

  // 新增处理编辑持仓的函数
  const handleEditPosition = (position: PositionType) => {
    setSelectedPosition(position);
    setIsEditPositionOpen(true);
  };

  // 计算总市值和总收益
  const totalMarketValue = positions.reduce((sum, position) => sum + position.marketValue, 0);
  const stockGain = positions.reduce((sum, position) => sum + position.unrealizedPnL, 0);

  const handleUpdatePositions = () => {
    refetch();
  }

  // 如果还在加载中，显示骨架屏
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Risk Mode Selector Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Positions Management Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-36" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-32" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
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
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 如果获取数据失败
  if (isError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-500">加载失败</CardTitle>
            <CardDescription>无法获取持仓数据，请稍后重试</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Positions Management */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              {/* 新增一个股票总金额的展示 */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">股票总金额:</span>
                <span className="text-lg font-bold">${totalMarketValue.toLocaleString()}</span>
              </div>
              {/* 新增一个股票总收益的展示 */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">持仓总收益:</span>
                <span className="text-lg font-bold">${stockGain.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索股票代码..."
                  className="pl-8 w-full md:w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={filterMarket} onValueChange={setFilterMarket}>
                  <SelectTrigger className="w-full md:w-36">
                    <FilterIcon className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="市场" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部市场</SelectItem>
                    <SelectItem value="美股">美股</SelectItem>
                    <SelectItem value="A股">A股</SelectItem>
                    <SelectItem value="港股">港股</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无持仓数据</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('symbol')}
                  >
                    <div className="flex items-center">
                      股票代码
                      {getSortIcon('symbol')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('market')}
                  >
                    <div className="flex items-center">
                      市场
                      {getSortIcon('market')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('quantity')}
                  >
                    <div className="flex items-center">
                      数量
                      {getSortIcon('quantity')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('averageCost')}
                  >
                    <div className="flex items-center">
                      均价
                      {getSortIcon('averageCost')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('currentPrice')}
                  >
                    <div className="flex items-center">
                      当前价
                      {getSortIcon('currentPrice')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('marketValue')}
                  >
                    <div className="flex items-center">
                      市值
                      {getSortIcon('marketValue')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('unrealizedPnL')}
                  >
                    <div className="flex items-center">
                      持仓盈亏
                      {getSortIcon('unrealizedPnL')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('positionRatio')}
                  >
                    <div className="flex items-center">
                      持仓占比
                      {getSortIcon('positionRatio')}
                    </div>
                  </TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPositions.map((position) => (
                  <TableRow key={position.id}>
                    <TableCell className="font-medium">
                      <Link href={position.detailUrl} target="_blank" className="hover:text-blue-500">
                        {position.symbol}
                        {position.chineseName && (
                          <span className="ml-2">({position.chineseName})</span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={position.market === 'HK' ? 'secondary' : 'default'}>
                        {marketToChinese(position.market)}
                      </Badge>
                    </TableCell>
                    <TableCell>{position.quantity}</TableCell>
                    <TableCell>
                      <span className={
                        position.currentPrice > position.averageCost
                          ? 'text-green-500'
                          : position.currentPrice < position.averageCost
                            ? 'text-red-500'
                            : ''
                      }>
                        ${position.averageCost.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={
                        position.currentPrice > position.averageCost
                          ? 'text-green-500'
                          : position.currentPrice < position.averageCost
                            ? 'text-red-500'
                            : ''
                      }>
                        ${position.currentPrice.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>${position.marketValue.toLocaleString()}</TableCell>
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
                          ${Math.abs(position.unrealizedPnL).toLocaleString()}
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
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => handleEditPosition(position)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        {position.assetMetaId && (
                          <Link href={`/asset-market-info/${position.assetMetaId}`}>
                            <Button
                              variant="outline"
                              size="icon-sm"
                            >
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
      </Card>

      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>风险提醒</CardTitle>
            <CardDescription>需要关注的风险事项</CardDescription>
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
                    {alert.severity === 'high' ? '高' : alert.severity === 'medium' ? '中' : '低'}
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
