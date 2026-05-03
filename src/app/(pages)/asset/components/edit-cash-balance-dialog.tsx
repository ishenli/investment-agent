'use client';

import { useState, useEffect } from 'react';
import { useAccountQuery, useUpdateAccountBalanceMutation } from '@renderer/hooks/useAssetQueries';
import { formatCurrency } from '@renderer/lib/utils';
import { Button } from '@renderer/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { notificationManager } from '@/app/lib/notification';
import { useTranslation } from 'react-i18next';

interface EditCashBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCashBalanceDialog({ open, onOpenChange }: EditCashBalanceDialogProps) {
  const { t } = useTranslation('asset');
  const { data: account } = useAccountQuery();
  const { mutate: updateBalance, isPending } = useUpdateAccountBalanceMutation();
  const [newBalance, setNewBalance] = useState('');

  // 当对话框打开时，初始化新余额为当前余额
  useEffect(() => {
    if (open && account?.balance !== undefined) {
      setNewBalance(account.balance.toString());
    } else if (!open) {
      // 关闭对话框时清空输入框
      setNewBalance('');
    }
  }, [open, account?.balance]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const balanceValue = parseFloat(newBalance);
    if (isNaN(balanceValue) || balanceValue < 0) {
      notificationManager.toast({ title: t('editCashBalanceDialog.invalidAmount'), variant: 'error' });
      return;
    }

    updateBalance(balanceValue, {
      onSuccess: () => {
        notificationManager.toast({ title: t('editCashBalanceDialog.balanceUpdated'), variant: 'success' });
        onOpenChange(false);
      },
      onError: (error) => {
        notificationManager.toast({ title: t('editCashBalanceDialog.updateFailed') + ': ' + (error as Error).message, variant: 'error' });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('editCashBalanceDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('editCashBalanceDialog.description')}{' '}
            {account?.balance !== undefined ? formatCurrency(account.balance) : t('loading')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="balance" className="text-right">
                {t('editCashBalanceDialog.newBalanceLabel')}
              </Label>
              <div className="col-span-3 relative">
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  className="pl-8"
                  placeholder="0.00"
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  ¥
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('editCashBalanceDialog.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('editCashBalanceDialog.updating') : t('editCashBalanceDialog.updateBalance')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}