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
import { toast } from 'sonner';

interface EditCashBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCashBalanceDialog({ open, onOpenChange }: EditCashBalanceDialogProps) {
  const { data: account } = useAccountQuery();
  const { mutate: updateBalance, isPending } = useUpdateAccountBalanceMutation();
  const [newBalance, setNewBalance] = useState(account?.balance?.toString() || '');

  // 当对话框打开时，初始化新余额为当前余额
  useEffect(() => {
    if (open && account?.balance !== undefined) {
      setNewBalance(account.balance.toString());
    }
  }, [open, account?.balance]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const balanceValue = parseFloat(newBalance);
    if (isNaN(balanceValue) || balanceValue < 0) {
      toast.error('请输入有效的金额');
      return;
    }

    updateBalance(balanceValue, {
      onSuccess: () => {
        toast.success('现金余额已更新');
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error('更新现金余额失败: ' + (error as Error).message);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>修改现金余额</DialogTitle>
          <DialogDescription>
            输入新的现金余额。当前余额:{' '}
            {account?.balance !== undefined ? formatCurrency(account.balance) : '加载中...'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="balance" className="text-right">
                新余额
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
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '更新中...' : '更新余额'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
