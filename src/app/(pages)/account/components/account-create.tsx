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
import { useState } from 'react';
import { useAccountStore } from '@renderer/store/account/store';
import { CreateTradingAccountRequestType } from '@typings/account';

export function AccountCreate() {
  const { createAccount, creating, error, createdAccount } = useAccountStore();

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

  // 如果账户已创建，显示成功消息
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
            <p>您的账户已成功创建！</p>
            <div className="rounded-lg border p-4 space-y-2">
              <p>
                <strong>用户名:</strong> {username}
              </p>
              <p>
                <strong>账户ID:</strong> {createdAccount.id}
              </p>
              <p>
                <strong>初始余额:</strong> {createdAccount.currency}{' '}
                {createdAccount.balance.toFixed(2)}
              </p>
              <p>
                <strong>市场:</strong> {createdAccount.market}
              </p>
              <p>
                <strong>杠杆:</strong> {createdAccount.leverage}x
              </p>
            </div>
            <Button onClick={() => window.location.reload()}>创建另一个账户</Button>
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
