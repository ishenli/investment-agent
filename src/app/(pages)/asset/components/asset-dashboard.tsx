'use client';

import {
  useAccountQuery,
  usePositionsQuery,
  useRevenueQuery,
  useSummaryQuery,
} from '@renderer/hooks/useAssetQueries';
import { AmountText } from './hide-amount-toggle';
import {
  Card,
  CardContent,
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
import { formatCurrency } from '@renderer/lib/utils';
import { Skeleton } from '@renderer/components/ui/skeleton';
import { useState } from 'react';
import { EditCashBalanceDialog } from './edit-cash-balance-dialog';
import { useTranslation } from 'react-i18next';
import { EXCHANGE_RATES } from '@shared/constant';
import { USD_TO_CNY } from '@/shared';
import Link from 'next/link';

// ====== 币种切换相关 ======

export type DisplayCurrency = 'USD' | 'CNY';

const CURRENCY_CONFIG = {
  USD: { code: 'USD', symbol: '$', locale: 'en-US', label: 'USD ($)' },
  CNY: { code: 'CNY', symbol: '¥', locale: 'zh-CN', label: 'CNY (¥)' },
} as const;

/** 将 USD 值转为显示币种 */
function convertFromUsd(usdValue: number, displayCurrency: DisplayCurrency): number {
  if (displayCurrency === 'CNY') return usdValue * USD_TO_CNY;
  return usdValue;
}

/** 将 CNY 值转为显示币种 */
function convertFromCny(cnyValue: number, displayCurrency: DisplayCurrency): number {
  if (displayCurrency === 'USD') return cnyValue * EXCHANGE_RATES.CNY_TO_USD;
  return cnyValue;
}

/** 用显示币种格式化金额 */
function fmtCurrency(value: number, displayCurrency: DisplayCurrency): string {
  const cfg = CURRENCY_CONFIG[displayCurrency];
  return formatCurrency(value, cfg.code, cfg.locale);
}

// ====== 通用组件 ======

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

/** 币种切换按钮 */
export function CurrencySwitcher({
  value,
  onChange,
}: {
  value: DisplayCurrency;
  onChange: (v: DisplayCurrency) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border bg-muted p-0.5">
      {(['USD', 'CNY'] as const).map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            value === c
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {CURRENCY_CONFIG[c].label}
        </button>
      ))}
    </div>
  );
}

// ====== 主组件 ======

export function AssetDashboard({ accountId, displayCurrency }: { accountId: string; displayCurrency: DisplayCurrency }) {
  const { data: account, isLoading: isAccountLoading, isError: isAccountError } = useAccountQuery();
  const { isLoading: isPositionsLoading } = usePositionsQuery();
  const { isLoading: isRevenueLoading } = useRevenueQuery();
  const { data: summary, isLoading: isSummaryLoading } = useSummaryQuery();
  const { t } = useTranslation('asset');

  const [isEditCashBalanceOpen, setIsEditCashBalanceOpen] = useState(false);

  // Loading skeleton
  if (isAccountLoading || isPositionsLoading || isRevenueLoading || isSummaryLoading) {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <Card key={index}>
              <CardContent className="pt-4 pb-3">
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-7 w-28" />
                <Skeleton className="h-3 w-20 mt-1.5" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-4 pb-3">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-2.5 w-full rounded-full mb-3" />
            <div className="space-y-1.5">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (isAccountError) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard title={t('dashboard.totalBalance')} icon={<WalletIcon className="h-4 w-4 text-muted-foreground" />}>
            <div className="text-2xl font-bold text-red-500">{t('dashboard.noData')}</div>
            <p className="text-xs text-muted-foreground">{t('dashboard.noDataDesc')}</p>
          </SummaryCard>
          <SummaryCard title={t('dashboard.stockMarketValue')} icon={<TrendingUpIcon className="h-4 w-4 text-blue-500" />}>
            <div className="text-2xl font-bold text-red-500">{t('dashboard.noData')}</div>
          </SummaryCard>
          <SummaryCard title={t('dashboard.cashBalance')} icon={<WalletIcon className="h-4 w-4 text-green-500" />}>
            <div className="text-2xl font-bold text-red-500">{t('dashboard.noData')}</div>
          </SummaryCard>
          <SummaryCard title={t('dashboard.stockGain')} icon={<BarChartIcon className="h-4 w-4 text-muted-foreground" />}>
            <div className="text-2xl font-bold text-red-500">{t('dashboard.noData')}</div>
          </SummaryCard>
        </div>
      </div>
    );
  }

  // No account
  if (!account) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard title={t('dashboard.totalBalance')} icon={<WalletIcon className="h-4 w-4 text-muted-foreground" />}>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">{t('dashboard.noAccountDataDesc')}</p>
          </SummaryCard>
          <SummaryCard title={t('dashboard.stockMarketValue')} icon={<TrendingUpIcon className="h-4 w-4 text-blue-500" />}>
            <div className="text-2xl font-bold">-</div>
          </SummaryCard>
          <SummaryCard title={t('dashboard.cashBalance')} icon={<WalletIcon className="h-4 w-4 text-green-500" />}>
            <div className="text-2xl font-bold">-</div>
          </SummaryCard>
          <SummaryCard title={t('dashboard.stockGain')} icon={<BarChartIcon className="h-4 w-4 text-muted-foreground" />}>
            <div className="text-2xl font-bold">-</div>
          </SummaryCard>
        </div>
      </div>
    );
  }

  // ====== 从 summary 提取原始数据 ======

  const {
    totalInvestment: summaryTotalInvestment,
    stockReturnRate,
    // 按币种分组
    usdStockValue = 0,
    usdStockGain = 0,
    usdStockReturnRate = 0,
    cnyStockValue = 0,
    cnyStockGain = 0,
    cnyStockReturnRate = 0,
    cnyTotalInvestment = 0,
    usdCashBalance = 0,
    cnyCashBalance = 0,
    hasCnyAssets = false,
  } = summary || {};

  // ====== 按显示币种统一计算展示值 ======

  const dc = displayCurrency;
  const fmt = (v: number) => fmtCurrency(v, dc);

  // 总资产
  const displayTotalBalance = convertFromUsd(usdStockValue + usdCashBalance, dc)
    + convertFromCny(cnyStockValue + cnyCashBalance, dc);

  // 现金
  const displayCashBalance = convertFromUsd(usdCashBalance, dc) + convertFromCny(cnyCashBalance, dc);

  // 股票（USD 资产）
  const displayStockValue = convertFromUsd(usdStockValue, dc);
  const displayStockGain = convertFromUsd(usdStockGain, dc);
  const displayStockInvestment = convertFromUsd(summaryTotalInvestment || 0, dc);

  // 基金（CNY 资产）
  const displayFundValue = convertFromCny(cnyStockValue, dc);
  const displayFundGain = convertFromCny(cnyStockGain, dc);
  const displayFundInvestment = convertFromCny(cnyTotalInvestment, dc);

  // 资产配置比例（基于统一币种）
  const totalHoldingsValue = displayStockValue + displayFundValue;
  const stockPercent = displayTotalBalance > 0 ? (displayStockValue / displayTotalBalance) * 100 : 0;
  const fundPercent = displayTotalBalance > 0 ? (displayFundValue / displayTotalBalance) * 100 : 0;
  const cashPercent = displayTotalBalance > 0 ? (displayCashBalance / displayTotalBalance) * 100 : 0;

  // 总盈亏
  const displayAllGain = displayStockGain + displayFundGain;

  return (
    <div className="space-y-3">
      {/* ===== 顶部：总览 + 现金 + 资产类型 一行展示 ===== */}
      <div className={`grid gap-3 ${hasCnyAssets ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
        {/* 总余额 */}
        <Link href="/asset-trend" className="block">
          <Card className="group cursor-pointer hover:border-primary/40 transition-colors h-full">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{t('dashboard.totalBalance')}</span>
                <TrendingUpIcon className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-2xl font-bold tracking-tight">{<AmountText value={fmt(displayTotalBalance)} />}</div>
              <div className="flex items-center gap-1 mt-1">
                {displayAllGain >= 0 ? (
                  <ArrowUpIcon className="h-3 w-3 text-green-500" />
                ) : (
                  <ArrowDownIcon className="h-3 w-3 text-red-500" />
                )}
                <span className={`text-xs font-medium ${displayAllGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <AmountText value={`${displayAllGain >= 0 ? '+' : ''}${fmt(displayAllGain)}`} />
                </span>
                <span className="text-xs text-muted-foreground">{t('dashboard.unrealizedPnL')}</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* 现金余额 */}
        <Card className="group">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">{t('dashboard.cashBalance')}</span>
              <PencilIcon
                onClick={() => setIsEditCashBalanceOpen(true)}
                className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-green-600 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
            <div className="text-2xl font-bold">{<AmountText value={fmt(displayCashBalance)} />}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {t('dashboard.cashRatio')} <AmountText value={`${cashPercent.toFixed(1)}%`} />
            </div>
          </CardContent>
        </Card>

        {/* 股票资产 */}
        <AssetTypeCard
          icon={<TrendingUpIcon className="h-3.5 w-3.5 text-blue-500" />}
          title={t('dashboard.stockAssets')}
          accentColor="text-blue-600"
          returnRate={usdStockReturnRate || 0}
          marketValue={<AmountText value={fmt(displayStockValue)} />}
          gain={displayStockGain}
          gainText={<AmountText value={fmt(displayStockGain)} />}
          investment={<AmountText value={fmt(displayStockInvestment)} />}
          investmentLabel={t('dashboard.totalInvestment')}
          pnlLabel={t('dashboard.unrealizedPnL')}
        />

        {/* 基金资产 */}
        {hasCnyAssets && (
          <AssetTypeCard
            icon={<BarChartIcon className="h-3.5 w-3.5 text-orange-500" />}
            title={t('dashboard.fundAssets')}
            accentColor="text-orange-600"
            returnRate={cnyStockReturnRate || 0}
            marketValue={<AmountText value={fmt(displayFundValue)} />}
            gain={displayFundGain}
            gainText={<AmountText value={fmt(displayFundGain)} />}
            investment={<AmountText value={fmt(displayFundInvestment)} />}
            investmentLabel={t('dashboard.totalInvestment')}
            pnlLabel={t('dashboard.unrealizedPnL')}
          />
        )}
      </div>

      {/* Edit Cash Balance Dialog */}
      <EditCashBalanceDialog open={isEditCashBalanceOpen} onOpenChange={setIsEditCashBalanceOpen} />

      {/* ===== 资产配置比例 ===== */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="text-sm font-semibold mb-3">{t('dashboard.assetAllocation')}</div>
          {/* 组合比例条 */}
          <div className="h-2.5 flex rounded-full overflow-hidden mb-3">
            {stockPercent > 0 && (
              <div className="bg-blue-500 transition-all" style={{ width: `${stockPercent}%` }} />
            )}
            {fundPercent > 0 && (
              <div className="bg-orange-500 transition-all" style={{ width: `${fundPercent}%` }} />
            )}
            {cashPercent > 0 && (
              <div className="bg-green-500 transition-all" style={{ width: `${cashPercent}%` }} />
            )}
          </div>

          {/* 明细列表 */}
          <div className="space-y-1.5">
            <AllocationRow dot="bg-blue-500" label={t('dashboard.stockMarketValueLabel')} value={<AmountText value={fmt(displayStockValue)} />} percent={stockPercent} />
            {hasCnyAssets && (
              <AllocationRow dot="bg-orange-500" label={t('dashboard.fundAssets')} value={<AmountText value={fmt(displayFundValue)} />} percent={fundPercent} />
            )}
            <AllocationRow dot="bg-green-500" label={t('dashboard.cashBalanceLabel')} value={<AmountText value={fmt(displayCashBalance)} />} percent={cashPercent} />
            <div className="flex justify-between items-center border-t pt-1.5 mt-1">
              <span className="text-xs font-medium">{t('dashboard.totalAssets')}</span>
              <span className="text-xs font-bold">{<AmountText value={fmt(displayTotalBalance)} />}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ====== 子组件 ======

/** 资产类型卡片（股票 / 基金） */
function AssetTypeCard({
  icon, title, accentColor, returnRate,
  marketValue, gain, gainText, investment,
  investmentLabel, pnlLabel,
}: {
  icon: React.ReactNode;
  title: string;
  accentColor: string;
  returnRate: number;
  marketValue: string | React.ReactNode;
  gain: number;
  gainText: string | React.ReactNode;
  investment: string| React.ReactNode;
  investmentLabel: string;
  pnlLabel: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        {/* 标题行 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            {icon}
            {title}
          </div>
          <AmountText
            value={returnRate >= 0 ? `+${returnRate.toFixed(2)}%` : `${returnRate.toFixed(2)}%`}
            className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
              returnRate >= 0
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          />
        </div>

        {/* 市值 */}
        <div className={`text-2xl font-bold ${accentColor}`}>{marketValue}</div>

        {/* 盈亏 + 本金 */}
        <div className="mt-1 text-xs space-y-0.5">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">{pnlLabel}</span>
            <span className={`font-semibold ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {gain >= 0 ? '+' : ''}{gainText}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">{investmentLabel}</span>
            <span className="font-semibold">{investment}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** 配置比例行 */
function AllocationRow({ dot, label, value, percent }: { dot: string; label: string; value: React.ReactNode; percent: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />
        <span className="text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-medium">{value}</span>
        <AmountText value={`${percent.toFixed(1)}%`} className="text-muted-foreground w-12 text-right" />
      </div>
    </div>
  );
}
