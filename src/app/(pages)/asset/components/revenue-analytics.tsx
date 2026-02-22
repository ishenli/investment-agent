'use client';

import { useRevenueQuery, useRevenueHistoryQuery } from '@renderer/hooks/useAssetQueries';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { useState } from 'react';
import { Skeleton } from '@renderer/components/ui/skeleton';
import { Button } from '@renderer/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { SnapshotRevenuePeriod } from '@typings/account';

export function RevenueAnalytics() {
  const [period, setPeriod] = useState<SnapshotRevenuePeriod>('1M');
  const [needsRetry, setNeedsRetry] = useState(false);

  // 使用React Query获取收益数据（基于快照）
  const { data: metrics, isLoading, isError, refetch } = useRevenueQuery(period);

  // 使用React Query获取收益历史数据（基于快照）
  const {
    data: historyData,
    isLoading: historyLoading,
    isError: historyError,
    refetch: refetchHistory,
  } = useRevenueHistoryQuery(period);

  // 合并加载状态
  const isLoadingAny = isLoading || historyLoading;

  // 合并错误状态
  const isErrorAny = isError || historyError;

  // 格式化日期为显示字符串
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  // 格式化数据用于收益率曲线图（返回数值类型）
  const formatChartProfitRate = () => {
    if (!historyData || !historyData.data) return [];
    return historyData.data.map((item) => ({
      date: formatDate(item.date),
      value: item.profitRate, // 保持数值类型
    }));
  };

  // 格式化数据用于资产曲线图（返回数值类型）
  const formatChartTotalValue = () => {
    if (!historyData || !historyData.data) return [];
    return historyData.data.map((item) => ({
      date: formatDate(item.date),
      value: item.totalValue, // 保持数值类型
    }));
  };

  // 处理重试
  const handleRetry = () => {
    refetch();
    refetchHistory();
    setNeedsRetry(false);
  };

  // 计算Y轴范围（收益率）
  const getProfitRateYDomain = () => {
    const data = formatChartProfitRate();
    if (data.length === 0) return [-10, 15];
    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return [Math.floor(min / 5) * 5 - 5, Math.ceil(max / 5) * 5 + 5];
  };

  // 计算Y轴范围（总资产）- 基于期初值上下浮动固定比例
  const getTotalValueYDomain = () => {
    const data = formatChartTotalValue();
    if (data.length === 0) return [0, 10000];

    // 获取期初值（第一个数据点）
    const startValue = data[0].value;
    const values = data.map((d) => d.value);
    const actualMin = Math.min(...values);
    const actualMax = Math.max(...values);

    // 计算实际变化幅度（相对于期初值的百分比）
    const maxChange = ((actualMax - startValue) / startValue) * 100;
    const minChange = ((actualMin - startValue) / startValue) * 100;

    // 动态计算浮动比例：取实际变化幅度的绝对值，加上缓冲空间
    // 如果变化幅度小，至少使用 15% 的范围，避免斜率过高
    const bufferPercent = Math.max(
      Math.abs(maxChange),
      Math.abs(minChange),
      15 // 最小 15% 的范围
    ) * 1.2; // 额外加 20% 缓冲

    // 计算Y轴范围：期初值 ± bufferPercent
    const lowerBound = startValue * (1 - bufferPercent / 100);
    const upperBound = startValue * (1 + bufferPercent / 100);

    // 格式化为整齐的数字
    const roundToNiceNumber = (num: number, direction: 'up' | 'down') => {
      const magnitude = Math.pow(10, Math.floor(Math.log10(num)));
      const normalized = num / magnitude;
      if (direction === 'up') {
        return Math.ceil(normalized) * magnitude;
      }
      return Math.floor(normalized) * magnitude;
    };

    return [
      Math.max(0, roundToNiceNumber(lowerBound, 'down')),
      roundToNiceNumber(upperBound, 'up')
    ];
  };

  // 如果还在加载中，显示骨架屏
  if (isLoadingAny) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-16 mt-2" />
                <Skeleton className="h-3 w-24 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-32 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center">
                  <Skeleton className="h-64 w-full rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // 如果获取数据失败或需要重试
  if (isErrorAny && needsRetry) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-500">加载失败</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">无法获取收益数据</div>
              <p className="text-xs text-muted-foreground mb-4">请稍后重试</p>
              <Button onClick={handleRetry} size="sm" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                重试
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 如果没有数据
  if (!metrics) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">暂无数据</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">暂无快照数据，请先创建快照</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 从历史数据获取衍生指标
  const derivedMetrics = historyData?.derivedMetrics || {
    annualizedReturn: 0,
    maxDrawdown: 0,
    volatility: 0,
    sharpeRatio: 0,
    totalReturn: 0,
  };

  // 从快照数据获取业绩指标
  const { performance, positions } = metrics;
  const profitRate = performance.profitRate;

  // 检查历史数据是否为空
  const hasChartData = historyData && historyData.data && historyData.data.length > 0;

  return (
    <div className="space-y-6">
      {/* 时间范围选择器 */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">时间范围:</label>
          <Select value={period} onValueChange={(v) => setPeriod(v as SnapshotRevenuePeriod)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1W">1周</SelectItem>
              <SelectItem value="1M">1个月</SelectItem>
              <SelectItem value="3M">3个月</SelectItem>
              <SelectItem value="6M">6个月</SelectItem>
              <SelectItem value="YTD">年初至今</SelectItem>
              <SelectItem value="1Y">1年</SelectItem>
              <SelectItem value="ALL">全部时间</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isErrorAny && (
          <Button onClick={handleRetry} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新数据
          </Button>
        )}
      </div>

      {/* Revenue Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总收益率</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${profitRate >= 0 ? 'text-green-500' : 'text-red-500'}`}
            >
              {profitRate >= 0 ? '+' : ''}
              {profitRate.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">
              期初: ${metrics.comparisonSnapshot.totalValue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">年化收益率</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${performance.annualizedReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}
            >
              {performance.annualizedReturn >= 0 ? '+' : ''}
              {performance.annualizedReturn.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">年化表现</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">超额收益</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${performance.excessReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}
            >
              {performance.excessReturn >= 0 ? '+' : ''}
              {performance.excessReturn.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">
              基准收益: {performance.benchmarkProfitRate.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">收益金额</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${performance.profitAmount >= 0 ? 'text-green-500' : 'text-red-500'}`}
            >
              {performance.profitAmount >= 0 ? '+' : ''}$
              {performance.profitAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">持有 {metrics.daysHeld} 天</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">夏普比率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{derivedMetrics.sharpeRatio.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">风险调整后收益</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Profit Rate Chart */}
        <Card>
          <CardHeader>
            <CardTitle>累计收益率</CardTitle>
            <CardDescription>相对于期初的累计收益表现</CardDescription>
          </CardHeader>
          <CardContent>
            {hasChartData ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formatChartProfitRate()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis
                      tickFormatter={(value: number) => `${value.toFixed(1)}%`}
                      domain={getProfitRateYDomain()}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(2)}%`, '累计收益率']}
                      labelFormatter={(label) => `日期: ${label}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="累计收益率"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <p className="text-muted-foreground">暂无图表数据</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Value Chart */}
        <Card>
          <CardHeader>
            <CardTitle>总资产变化</CardTitle>
            <CardDescription>账户总资产走势</CardDescription>
          </CardHeader>
          <CardContent>
            {hasChartData ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formatChartTotalValue()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis
                      tickFormatter={(value: number) => `$${value.toLocaleString()}`}
                      domain={getTotalValueYDomain()}
                    />
                    <Tooltip
                      formatter={(value: number) => [`$${value.toLocaleString()}`, '总资产']}
                      labelFormatter={(label) => `日期: ${label}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="总资产"
                      stroke="#82ca9d"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <p className="text-muted-foreground">暂无图表数据</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>详细指标</CardTitle>
          <CardDescription>投资组合的详细收益指标</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">波动率</p>
              <p className="text-2xl font-bold">{(derivedMetrics.volatility * 100).toFixed(2)}%</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">最大回撤</p>
              <p className="text-2xl font-bold text-red-500">
                {derivedMetrics.maxDrawdown ? `-${(derivedMetrics.maxDrawdown * 100).toFixed(2)}%` : '0%'}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">当前总资产</p>
              <p className="text-2xl font-bold">
                ${metrics.currentSnapshot.totalValue.toLocaleString()}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">持仓数量</p>
              <p className="text-2xl font-bold">{positions.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Positions Performance */}
      {positions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>持仓收益明细</CardTitle>
            <CardDescription>各持仓对总收益的贡献</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {positions.slice(0, 5).map((pos) => (
                <div key={pos.symbol} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{pos.symbol}</span>
                    <span className="text-sm text-muted-foreground">{pos.quantity} 股</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div
                        className={`font-medium ${pos.profitAmount >= 0 ? 'text-green-500' : 'text-red-500'}`}
                      >
                        {pos.profitAmount >= 0 ? '+' : ''}${pos.profitAmount.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {pos.profitRate >= 0 ? '+' : ''}
                        {pos.profitRate.toFixed(2)}%
                      </div>
                    </div>
                    <div className="w-20 text-right">
                      <div className="text-sm text-muted-foreground">贡献</div>
                      <div
                        className={`font-medium ${pos.contribution >= 0 ? 'text-green-500' : 'text-red-500'}`}
                      >
                        {pos.contribution >= 0 ? '+' : ''}
                        {pos.contribution.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}