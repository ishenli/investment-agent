'use client';

import { useEffect } from 'react';
import { useAccountStore } from '@renderer/store/account/store';
import { TradingAccountType } from '@typings/account';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import { Button } from '@renderer/components/ui/button';
import { IconUser, IconCurrencyDollar, IconChartLine } from '@tabler/icons-react';
import Link from 'next/link';

interface SwitchAccountDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SwitchAccountDialog({ open, onClose }: SwitchAccountDialogProps) {
  const currentAccount = useAccountStore((state) => state.account);
  const accounts = useAccountStore((state) => state.accounts);
  const loading = useAccountStore((state) => state.loading);
  const error = useAccountStore((state) => state.error);
  const setAccount = useAccountStore((state) => state.setAccount);
  const fetchAccounts = useAccountStore((state) => state.fetchAccounts);

  useEffect(() => {
    if (open) {
      fetchAccounts();
    }
  }, [open, fetchAccounts]);

  useEffect(() => {
    // 当账户列表加载完成后，如果当前没有选中账户，则尝试从服务端获取用户选中的账户
    if (open && accounts.length > 0 && !currentAccount) {
      fetchSelectedAccount();
    }
  }, [open, accounts, currentAccount]);

  const fetchSelectedAccount = async () => {
    try {
      const response = await fetch('/api/account/selected');
      if (!response.ok) {
        throw new Error('Failed to fetch selected account');
      }

      const data = await response.json();
      const selectedAccountId = data.data?.selectedAccountId;

      if (selectedAccountId) {
        const selectedAccount = accounts.find((account) => account.id === selectedAccountId);
        if (selectedAccount) {
          setAccount(selectedAccount);
        }
      }
    } catch (error) {
      console.error('Failed to fetch selected account:', error);
    }
  };

  const handleSelectAccount = async (account: TradingAccountType) => {
    await setAccount(account);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>切换账户</DialogTitle>
          <DialogDescription>选择一个账户进行操作</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">
            <p>加载中...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-red-500">{error}</p>
            <Button onClick={onClose} className="mt-4">
              关闭
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {accounts.length === 0 ? (
              <div className="py-8 text-center">
                <p>暂无账户</p>
                <Link href="/account/create">
                  <Button className="mt-4">创建新账户</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      currentAccount?.id === account.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => handleSelectAccount(account)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium flex items-center gap-2">
                          <IconUser className="w-4 h-4" />
                          {account.accountName || `账户 ${account.id}`}
                        </h3>
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <IconCurrencyDollar className="w-4 h-4" />
                            <span>
                              余额: {account.balance?.toFixed(2)} {account.currency}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <IconChartLine className="w-4 h-4" />
                            <span>市场: {account.market}</span>
                          </div>
                        </div>
                      </div>
                      {currentAccount?.id === account.id && (
                        <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                          当前
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button onClick={onClose}>关闭</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
