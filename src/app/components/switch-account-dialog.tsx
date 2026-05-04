'use client';

import { useEffect, useState } from 'react';
import { useAccountStore } from '@renderer/store/account/store';
import { TradingAccountType } from '@typings/account';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@renderer/components/ui/alert-dialog';
import { Button } from '@renderer/components/ui/button';
import { IconUser, IconCurrencyDollar, IconChartLine, IconTrash } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SwitchAccountDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SwitchAccountDialog({ open, onClose }: SwitchAccountDialogProps) {
  const router = useRouter();
  const currentAccount = useAccountStore((state) => state.account);
  const accounts = useAccountStore((state) => state.accounts);
  const loading = useAccountStore((state) => state.loading);
  const error = useAccountStore((state) => state.error);
  const setAccount = useAccountStore((state) => state.setAccount);
  const fetchAccounts = useAccountStore((state) => state.fetchAccounts);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<TradingAccountType | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteClick = (e: React.MouseEvent, account: TradingAccountType) => {
    e.stopPropagation();
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!accountToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/account?accountId=${accountToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '删除账户失败');
      }

      // 刷新账户列表
      await fetchAccounts();

      // 如果删除的是当前选中的账户，清除选中状态并跳转
      if (currentAccount?.id === accountToDelete.id) {
        // 检查是否还有其他账户
        const remainingAccounts = accounts.filter((a) => a.id !== accountToDelete.id);
        if (remainingAccounts.length > 0) {
          // 自动选择第一个可用账户
          await setAccount(remainingAccounts[0]);
        } else {
          // 没有其他账户，跳转到创建页面
          router.push('/account/create');
        }
      }

      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    } catch (error) {
      console.error('Failed to delete account:', error);
      alert(error instanceof Error ? error.message : '删除账户失败');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
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
                        <div className="flex-1">
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
                        <div className="flex items-center gap-2">
                          {currentAccount?.id === account.id && (
                            <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                              当前
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={(e) => handleDeleteClick(e, account)}
                            title="删除账户"
                          >
                            <IconTrash className="h-4 w-4" />
                          </Button>
                        </div>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除账户</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除账户「{accountToDelete?.accountName || `账户 ${accountToDelete?.id}`}」吗？
              <br />
              <br />
              此操作无法撤销，但历史数据将保留用于审计。
              {currentAccount?.id === accountToDelete?.id && (
                <span className="block mt-2 text-orange-500">
                  您正在删除当前使用的账户，删除后将自动切换到其他账户。
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
