'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import { Label } from '@renderer/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import { Button } from '@renderer/components/ui/button';
import { IconSettings, IconCheck, IconShield } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useAccountStore } from '@renderer/store/account/store';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@renderer/components/ui/tabs';
import { useTranslation } from 'react-i18next';

export function AccountSettings() {
  const { account, loading, saving, error, updateAccountSettings, updateAccountRiskMode } =
    useAccountStore();
  const { t } = useTranslation('account');

  // 账户设置状态
  const [market, setMarket] = useState<'HK' | 'US' | 'CN'>(account?.market || 'US');
  const [leverage, setLeverage] = useState<string>(account?.leverage?.toString() || '1');
  const [selectedRiskMode, setSelectedRiskMode] = useState<'retail' | 'advanced'>(
    account?.riskMode || 'retail',
  );

  // 保存状态
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('account');

  useEffect(() => {
    if (account?.riskMode) {
      setSelectedRiskMode(account.riskMode);
    }
  }, [account?.riskMode]);

  const handleRiskModeChange = async (value: string) => {
    const mode = value as 'retail' | 'advanced';
    setSelectedRiskMode(mode);

    await updateAccountRiskMode(mode);
  };

  // 当账户数据加载完成后，更新本地状态
  useEffect(() => {
    if (account) {
      setMarket(account.market);
      setLeverage(account.leverage?.toString() || '1');
    }
  }, [account]);

  const handleSaveAccountSettings = async () => {
    setSaved(false);

    // 这里需要 accountId，实际项目中应该从上下文或路由参数中获取
    const accountId = account?.id || '1'; // 使用当前账户ID或默认值

    try {
      await updateAccountSettings(accountId, {
        market: market,
        leverage: parseInt(leverage),
      });
      setSaved(true);

      // 3秒后隐藏保存成功提示
      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to save account settings', error);
    }
  };

  // 如果正在加载且没有账户数据，显示加载状态
  if (loading && !account) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconSettings className="h-5 w-5" />
            {t('settings.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-muted-foreground">{t('loading')}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <IconShield className="h-4 w-4" />
              {t('settings.tabs.account')}
            </TabsTrigger>
            <TabsTrigger value="risk" className="flex items-center gap-2">
              <IconShield className="h-4 w-4" />
              {t('settings.tabs.risk')}
            </TabsTrigger>
          </TabsList>

          {/* 账户设置 Tab */}
          <TabsContent value="account" className="space-y-6 mt-6">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="market">{t('settings.market.label')}</Label>
              <Select
                value={market}
                onValueChange={(value: 'HK' | 'US' | 'CN') => setMarket(value)}
              >
                <SelectTrigger id="market">
                  <SelectValue placeholder={t('settings.market.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">美股</SelectItem>
                  <SelectItem value="CN">A股</SelectItem>
                  <SelectItem value="HK">港股</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {t('settings.market.description')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leverage">{t('settings.leverage.label')}</Label>
              <Select value={leverage} onValueChange={setLeverage}>
                <SelectTrigger id="leverage">
                  <SelectValue placeholder={t('settings.leverage.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1x (无杠杆)</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                  <SelectItem value="5">5x</SelectItem>
                  <SelectItem value="10">10x</SelectItem>
                  <SelectItem value="20">20x</SelectItem>
                  <SelectItem value="50">50x</SelectItem>
                  <SelectItem value="100">100x</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {t('settings.leverage.description')}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <Button onClick={handleSaveAccountSettings} disabled={saving}>
                {saving ? t('settings.saving') : t('settings.save')}
              </Button>
              {saved && activeTab === 'account' && (
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <IconCheck className="h-4 w-4" />
                  {t('settings.saved')}
                </div>
              )}
            </div>
          </TabsContent>

          {/* 风险模式 Tab */}
          <TabsContent value="risk" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle>{t('settings.riskMode.title')}</CardTitle>
                    <CardDescription>{t('settings.riskMode.description')}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{t('settings.riskMode.label')}:</span>
                    <Select value={selectedRiskMode} onValueChange={handleRiskModeChange}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder={t('settings.riskMode.placeholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retail">{t('settings.riskMode.retail')}</SelectItem>
                        <SelectItem value="advanced">{t('settings.riskMode.advanced')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
