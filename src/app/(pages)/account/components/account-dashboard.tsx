'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import {
  IconUser,
  IconCurrencyDollar,
  IconChartLine,
  IconTrendingUp,
  IconWallet,
} from '@tabler/icons-react';
import { useEffect } from 'react';
import { useAccountStore } from '@renderer/store/account/store';
import { accountSettingsSelectors } from '@renderer/store/account/slices/settings/selector';
import { useTranslation } from 'react-i18next';

export function AccountDashboard() {
  const accountData = useAccountStore(accountSettingsSelectors.account);
  const loading = useAccountStore(accountSettingsSelectors.loading);
  const error = useAccountStore(accountSettingsSelectors.error);
  const { t } = useTranslation('account');

  if (loading && !accountData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t('loading')}</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!accountData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t('dashboard.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconUser className="h-5 w-5" />
          {t('dashboard.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <IconUser className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t('dashboard.accountName')}</span>
            </div>
            <p className="text-lg font-semibold">{accountData.accountName}</p>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <IconWallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t('dashboard.accountBalance')}</span>
            </div>
            <p className="text-lg font-semibold">
              {accountData.currency} {accountData.balance.toFixed(2)}
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <IconChartLine className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t('dashboard.market')}</span>
            </div>
            <p className="text-lg font-semibold">{accountData.market}</p>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <IconTrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t('dashboard.leverage')}</span>
            </div>
            <p className="text-lg font-semibold">{accountData.leverage}x</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
