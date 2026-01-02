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
  Bar,
  BarChart,
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
import { revenueMetricType, revenueHistoryType } from '@typings/account';
import { Button } from '@renderer/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function RevenueAnalytics() {
  const [period, setPeriod] = useState('30d');
  const [granularity, setGranularity] = useState('monthly');
  const [needsRetry, setNeedsRetry] = useState(false);

  // 使用React Query获取收益数据
  const { data: metrics, isLoading, isError, refetch } = useRevenueQuery(period);

  // 使用React Query获取收益历史数据
  const { data: historyData, isLoading: historyLoading, isError: historyError, refetch: refetchHistory } = useRevenueHistoryQuery(period, granularity);

  // 合并加载状态
  const isLoadingAny = isLoading || historyLoading;

  // 合并错误状态
  const isErrorAny = isError || historyError;

  // 格式化数据用于图表
  const formatChartReturns = () => {
    if (!historyData || !historyData.data) return [];
    // 将 decimal 形式的收益率转换为百分比形式
    return historyData.data.map((item) => ({
      date: item.date,
      value: (item.returnRate * 100).toFixed(2),
    }));
  };

  const formatChartDrawdown = () => {
    if (!historyData || !historyData.data) return [];
    // 将 decimal 形式的回撤转换为百分比形式
    return historyData.data.map((item) => ({
      date: item.date,
      value: (item.drawdown * 100).toFixed(2),
    }));
  };

  // 处理重试
  const handleRetry = () => {
    refetch();
    refetchHistory();
    setNeedsRetry(false);
  };

  // 计算Y轴范围
  const getReturnsYDomain = () => {
    const data = formatChartReturns();
    if (data.length === 0) return [-10, 15];
    const values = data.map((d) => parseFloat(d.value as string));
    const min = Math.min(...values);
    const max = Math.max(...values);
    return [Math.floor(min / 5) * 5, Math.ceil(max / 5) * 5];
  };

  const getDrawdownYDomain = () => {
    const data = formatChartDrawdown();
    if (data.length === 0) return [-10, 0];
    const values = data.map((d) => parseFloat(d.value as string));
    const min = Math.min(...values);
    return [Math.floor(min / 5) * 5, 0];
  };

  // 如果还在加载中，显示骨架屏
  if (isLoadingAny) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-4 w-32 mt-2" />
                  </div>
                  <Skeleton className="h-10 w-32" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center">
                  <Skeleton className="h-64 w-full rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-48 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
              <p className="text-xs text-muted-foreground">暂无收益数据</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 获取衍生指标
  const derivedMetrics = historyData?.derivedMetrics || {
    annualizedReturn: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
    volatility: 0,
  };

  // 计算总收益率
  const totalReturn = metrics.unrealizedProfitRate + metrics.realizedProfitRate;

  // 使用真实数据还是回退到计算值
  const annualizedReturn = derivedMetrics.annualizedReturn;
  const sharpeRatio = derivedMetrics.sharpeRatio;
  const maxDrawdown = derivedMetrics.maxDrawdown;
  const volatility = derivedMetrics.volatility;

  // 检查历史数据是否为空
  const hasChartData = historyData && historyData.data && historyData.data.length > 0;

  return (
    <div className="space-y-6">
      {/* 时间范围和粒度选择器 */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">时间范围:</label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">最近7天</SelectItem>
              <SelectItem value="30d">最近1个月</SelectItem>
              <SelectItem value="90d">最近3个月</SelectItem>
              <SelectItem value="365d">最近1年</SelectItem>
              <SelectItem value="all">全部时间</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">时间粒度:</label>
          <Select value={granularity} onValueChange={setGranularity}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">按周</SelectItem>
              <SelectItem value="monthly">按月</SelectItem>
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
              className={`text-2xl font-bold ${totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}
            >
              {totalReturn >= 0 ? '+' : ''}
              {totalReturn.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">相对于初始投资</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">年化收益率</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${annualizedReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}
            >
              {annualizedReturn >= 0 ? '+' : ''}
              {(annualizedReturn * 100).toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">年化表现</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">夏普比率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sharpeRatio.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">风险调整后收益</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">浮动盈亏</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${metrics.unrealizedProfitRate >= 0 ? 'text-green-500' : 'text-red-500'}`}
            >
              {metrics.unrealizedProfitRate >= 0 ? '+' : ''}
              {metrics.unrealizedProfitRate.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">未实现盈亏</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">胜率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.winRate ? (metrics.winRate * 100).toFixed(0) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.profitableTrades || 0}/{metrics.totalTrades || 0} 次交易盈利
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Returns Chart */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>收益率</CardTitle>
                <CardDescription>
                  {granularity === 'daily' ? '日度' : granularity === 'weekly' ? '周度' : '月度'}收益率表现
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {hasChartData ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={formatChartReturns()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => `${value}%`} domain={getReturnsYDomain()} />
                    <Tooltip
                      formatter={(value) => [`${value}%`, '收益率']}
                      labelFormatter={(label) => `日期: ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="value" name="收益率" fill="#8884d8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <p className="text-muted-foreground">暂无图表数据</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Drawdown Chart */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>回撤</CardTitle>
                <CardDescription>最大回撤表现</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {hasChartData ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formatChartDrawdown()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => `${value}%`} domain={getDrawdownYDomain()} />
                    <Tooltip
                      formatter={(value) => [`${value}%`, '回撤']}
                      labelFormatter={(label) => `日期: ${label}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="回撤"
                      stroke="#ff0000"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
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
              <p className="text-2xl font-bold">
                {(volatility * 100).toFixed(2)}%
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">最大回撤</p>
              <p className="text-2xl font-bold text-red-500">
                {maxDrawdown ? `-${(maxDrawdown * 100).toFixed(2)}%` : '0%'}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">总交易次数</p>
              <p className="text-2xl font-bold">{metrics.totalTrades || 0}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">盈利交易</p>
              <p className="text-2xl font-bold text-green-500">
                {metrics.profitableTrades || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
