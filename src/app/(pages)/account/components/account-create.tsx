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

export function AccountCreate() {
  const { createAccount, creating, error, createdAccount, setAccount, setCreatedAccount, fetchAccounts } = useAccountStore();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [initialDeposit, setInitialDeposit] = useState('');
  const [market, setMarket] = useState<'US' | 'CN' | 'HK'>('US');
  const [leverage, setLeverage] = useState('1');
  const [navigating, setNavigating] = useState(false);

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
    if (createdAccount && !navigating) {
      setNavigating(true);

      // 自动设置为选中账户并跳转到资产页面
      const handleAccountCreated = async () => {
        try {
          // 刷新账户列表
          await fetchAccounts();

          // 设置为选中账户
          await setAccount(createdAccount);

          // 延迟 300ms 后跳转，确保状态更新
          setTimeout(() => {
            router.replace('/asset');
          }, 300);
        } catch (error) {
          console.error('Failed to set account or navigate:', error);
          setNavigating(false);
          // 如果设置或跳转失败，清空 createdAccount 状态允许用户手动操作
          setCreatedAccount(null);
        }
      };

      handleAccountCreated();
    }
  }, [createdAccount, setAccount, router, setCreatedAccount, navigating, fetchAccounts]);

  // 如果账户已创建，显示成功消息和跳转提示
  if (createdAccount) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconCheck className="h-5 w-5 text-green-500" />
            账户创建成功
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>您的账户已成功创建！正在跳转到资产页面...</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              正在设置账户并跳转...
            </div>

            {/* 如果自动跳转失败，提供手动跳转按钮 */}
            {!navigating && (
              <Button
                onClick={() => {
                  setAccount(createdAccount).then(() => router.push('/asset'));
                }}
                className="w-full"
              >
                手动跳转到资产页面
              </Button>
            )}
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
            <Label htmlFor="username">账户名</Label>
            <Input
              id="username"
              type="text"
              placeholder="输入账户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={30}
            />
            <p className="text-sm text-muted-foreground">用户名长度应在3-30个字符之间</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="initialDeposit">初始资金</Label>
            <Input
              id="initialDeposit"
              type="number"
              placeholder="输入初始资金金额"
              value={initialDeposit}
              onChange={(e) => setInitialDeposit(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="market">交易市场</Label>
            <Select value={market} onValueChange={(value: 'US' | 'CN' | 'HK') => setMarket(value)}>
              <SelectTrigger id="market">
                <SelectValue placeholder="选择市场" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">美股</SelectItem>
                <SelectItem value="CN">A股</SelectItem>
                <SelectItem value="HK">港股</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">选择您希望交易的市场</p>
          </div>

          <Button type="submit" disabled={creating} className="w-full">
            {creating ? '创建中...' : '创建交易账户'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}