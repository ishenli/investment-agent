'use client';

import {
  useAccountQuery,
  usePositionsQuery,
  useRevenueQuery,
  useSummaryQuery,
} from '@renderer/hooks/useAssetQueries';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  TrendingUpIcon,
  WalletIcon,
  BarChartIcon,
  PencilIcon,
} from 'lucide-react';
import { formatCurrency, formatPercentage } from '@renderer/lib/utils';
import { Skeleton } from '@renderer/components/ui/skeleton';
import { useState } from 'react';
import { EditCashBalanceDialog } from './edit-cash-balance-dialog';

// 定义摘要卡片组件
interface SummaryCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onIconClick?: () => void;
}

const SummaryCard = ({ title, icon, children, onIconClick }: SummaryCardProps) => (
  <Card className="group">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div onClick={onIconClick} className={onIconClick ? 'cursor-pointer hover:opacity-70' : ''}>
        {icon}
      </div>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

export function AssetDashboard({ accountId }: { accountId: string }) {
  // 使用React Query获取数据
  const { data: account, isLoading: isAccountLoading, isError: isAccountError } = useAccountQuery();
  const { data: positions, isLoading: isPositionsLoading } = usePositionsQuery();
  const { data: metrics, isLoading: isRevenueLoading } = useRevenueQuery();
  const { data: summary, isLoading: isSummaryLoading } = useSummaryQuery();

  // 现金余额编辑状态
  const [isEditCashBalanceOpen, setIsEditCashBalanceOpen] = useState(false);

  // 如果还在加载中，显示骨架屏
  if (isAccountLoading || isPositionsLoading || isRevenueLoading || isSummaryLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-24 mt-2" />
                <Skeleton className="h-3 w-16 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 如果获取账户信息失败
  if (isAccountError) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="总余额"
            icon={<WalletIcon className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="text-2xl font-bold text-red-500">加载失败</div>
            <p className="text-xs text-muted-foreground">无法获取账户信息</p>
          </SummaryCard>

          <SummaryCard title="股票市值" icon={<TrendingUpIcon className="h-4 w-4 text-blue-500" />}>
            <div className="text-2xl font-bold text-red-500">加载失败</div>
            <p className="text-xs text-muted-foreground">无法获取持仓数据</p>
          </SummaryCard>

          <SummaryCard title="现金余额" icon={<WalletIcon className="h-4 w-4 text-green-500" />}>
            <div className="text-2xl font-bold text-red-500">加载失败</div>
            <p className="text-xs text-muted-foreground">无法获取现金数据</p>
          </SummaryCard>

          <SummaryCard
            title="持仓股票收益"
            icon={<BarChartIcon className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="text-2xl font-bold text-red-500">加载失败</div>
            <p className="text-xs text-muted-foreground">无法获取收益数据</p>
          </SummaryCard>
        </div>
      </div>
    );
  }

  // 如果没有账户信息，显示空状态
  if (!account) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="总余额"
            icon={<WalletIcon className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">无账户信息</p>
          </SummaryCard>

          <SummaryCard title="股票市值" icon={<TrendingUpIcon className="h-4 w-4 text-blue-500" />}>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">无持仓数据</p>
          </SummaryCard>

          <SummaryCard title="现金余额" icon={<WalletIcon className="h-4 w-4 text-green-500" />}>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">无现金数据</p>
          </SummaryCard>

          <SummaryCard
            title="持仓股票收益"
            icon={<BarChartIcon className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">无收益数据</p>
          </SummaryCard>
        </div>

        {/* Revenue Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>业绩指标</CardTitle>
            <CardDescription>您的投资业绩表现</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">总收益率</p>
                <p className="text-2xl font-bold">-</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">年化收益率</p>
                <p className="text-2xl font-bold">-</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">波动率</p>
                <p className="text-2xl font-bold">-</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">最大回撤</p>
                <p className="text-2xl font-bold">-</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 使用从API获取的摘要数据
  const {
    stockAccountValue,
    cashBalance,
    totalBalance,
    totalInvestment: summaryTotalInvestment,
    stockAllocationPercent,
    cashAllocationPercent,
    stockGain,
    stockReturnRate,
    totalReturnRate,
  } = summary || {
    stockAccountValue: 0,
    cashBalance: 0,
    totalBalance: 0,
    totalInvestment: 0,
    stockAllocationPercent: 0,
    cashAllocationPercent: 0,
    stockGain: 0,
    stockReturnRate: 0,
    totalReturnRate: 0,
  };

  return (
    <div className="space-y-6">
      {/* Asset Overview - New Detailed Breakdown */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="总余额" icon={<WalletIcon className="h-4 w-4 text-muted-foreground" />}>
          <div className="text-2xl font-bold">{formatCurrency(totalBalance || 0)}</div>
        </SummaryCard>

        <SummaryCard
          title="现金余额"
          icon={
            <div className="relative">
              <WalletIcon className="h-4 w-4 text-green-500" />
            </div>
          }
          onIconClick={() => setIsEditCashBalanceOpen(true)}
        >
          <div className="flex text-2xl font-bold text-green-600 items-center justify-between">
            {formatCurrency(cashBalance || 0)}
            <span className="relative">
              <PencilIcon
                onClick={() => setIsEditCashBalanceOpen(true)}
                className="absolute -top-2 -right-2 h-3 w-3 text-muted-foreground cursor-pointer hover:text-green-600 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </span>
          </div>
        </SummaryCard>

        <SummaryCard title="股票市值" icon={<TrendingUpIcon className="h-4 w-4 text-blue-500" />}>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(stockAccountValue || 0)}
          </div>
        </SummaryCard>

        <SummaryCard
          title="持仓股票收益"
          icon={<BarChartIcon className="h-4 w-4 text-muted-foreground" />}
        >
          <div className="text-2xl font-bold">{metrics ? formatCurrency(stockGain) : '-'}</div>
        </SummaryCard>
      </div>

      {/* Edit Cash Balance Dialog */}
      <EditCashBalanceDialog open={isEditCashBalanceOpen} onOpenChange={setIsEditCashBalanceOpen} />

      {/* Asset Allocation Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>资产结构分析</CardTitle>
          <CardDescription>详细资产分布和占比情况</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Asset Breakdown */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">资产明细</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">股票市值</span>
                  <span className="font-medium">{formatCurrency(stockAccountValue || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">现金余额</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(cashBalance || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-sm font-medium">总资产</span>
                  <span className="font-bold">{formatCurrency(totalBalance || 0)}</span>
                </div>
              </div>

              {/* Asset Allocation Pie */}
              <div className="mt-4">
                <div className="text-sm text-muted-foreground mb-2">资产配置比例</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">股票占比</span>
                    <div className="flex items-center">
                      <div className="w-20 h-2 bg-gray-200 rounded mr-2">
                        <div
                          className="h-2 bg-blue-500 rounded"
                          style={{
                            width: `${stockAllocationPercent || 0}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">
                        {(stockAllocationPercent || 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">现金占比</span>
                    <div className="flex items-center">
                      <div className="w-20 h-2 bg-gray-200 rounded mr-2">
                        <div
                          className="h-2 bg-green-500 rounded"
                          style={{
                            width: `${cashAllocationPercent || 0}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">
                        {(cashAllocationPercent || 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">收益表现</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">持仓股票收益</span>
                  <span
                    className={`font-medium ${stockGain >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {formatCurrency(stockGain)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">股票收益率</span>
                  <span
                    className={`font-medium ${stockReturnRate >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {formatPercentage(stockReturnRate / 100)}
                  </span>
                </div>
                {/* <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">总收益率</span>
                  <span
                    className={`font-medium ${totalReturnRate >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {formatPercentage(totalReturnRate / 100)}
                  </span>
                </div> */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">投资本金</span>
                  <span className="font-medium">{formatCurrency(summaryTotalInvestment || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
