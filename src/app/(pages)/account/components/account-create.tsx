'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import { IconCheck } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccountStore } from '@renderer/store/account/store';
import { CreateTradingAccountRequestType } from '@typings/account';
import { useTranslation } from 'react-i18next';

export function AccountCreate() {
  const {
    createAccount,
    creating,
    error,
    createdAccount,
    setAccount,
    setCreatedAccount,
    fetchAccounts,
  } = useAccountStore();
  const router = useRouter();
  const { t } = useTranslation('account');

  const [username, setUsername] = useState('');
  const [initialDeposit, setInitialDeposit] = useState('');
  const [market, setMarket] = useState<'US' | 'CN' | 'HK'>('US');
  const [leverage, setLeverage] = useState('1');

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    const accountData: CreateTradingAccountRequestType = {
      accountName: username,
      initialDeposit: parseFloat(initialDeposit) || 0,
      market,
      leverage: parseInt(leverage) || 1,
    };

    await createAccount(accountData);
  };

  // 监听账户创建成功后的行为
  useEffect(() => {
    if (!createdAccount) return;

    // 自动设置为选中账户并跳转到资产页面
    const handleAccountCreated = async () => {
      try {
        // 刷新账户列表
        await fetchAccounts();

        // 设置为选中账户
        await setAccount(createdAccount);

        // 延迟 300ms 后跳转,确保状态更新
        setTimeout(() => {
          router.replace('/asset');
        }, 300);
      } catch (error) {
        console.error('Failed to set account or navigate:', error);
        // 如果设置或跳转失败,清空 createdAccount 状态允许用户手动操作
        setCreatedAccount(null);
      }
    };

    handleAccountCreated();
  }, [createdAccount, setAccount, router, setCreatedAccount, fetchAccounts]);

  // 如果账户已创建，显示成功消息和跳转提示
  if (createdAccount) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconCheck className="h-5 w-5 text-green-500" />
            {t('create.success.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>{t('create.success.message')}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              {t('create.success.redirecting')}
            </div>

            {/* 如果自动跳转失败,提供手动跳转按钮 */}
            <Button
              onClick={() => {
                setAccount(createdAccount).then(() => router.push('/asset'));
              }}
              className="w-full mt-4"
              variant="outline"
            >
              {t('create.success.manualRedirect')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleCreateAccount} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">{t('create.form.accountName.label')}</Label>
            <Input
              id="username"
              type="text"
              placeholder={t('create.form.accountName.placeholder')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={30}
            />
            <p className="text-sm text-muted-foreground">{t('create.form.accountName.description')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="initialDeposit">{t('create.form.initialDeposit.label')}</Label>
            <Input
              id="initialDeposit"
              type="number"
              placeholder={t('create.form.initialDeposit.placeholder')}
              value={initialDeposit}
              onChange={(e) => setInitialDeposit(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="market">{t('create.form.market.label')}</Label>
            <Select value={market} onValueChange={(value: 'US' | 'CN' | 'HK') => setMarket(value)}>
              <SelectTrigger id="market">
                <SelectValue placeholder={t('create.form.market.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">美股</SelectItem>
                <SelectItem value="CN">A股</SelectItem>
                <SelectItem value="HK">港股</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">{t('create.form.market.description')}</p>
          </div>

          <Button type="submit" disabled={creating} className="w-full">
            {creating ? t('create.form.creating') : t('create.form.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
