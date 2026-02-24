'use client';

import { useState, useEffect } from 'react';
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
import { PositionType } from '@typings/position';
import { usePositionStore } from '@renderer/store/position/store';
import { useTranslation } from 'react-i18next';

interface EditPositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: PositionType | null;
  onUpdate: () => void;
}

export function EditPositionDialog({
  open,
  onOpenChange,
  position,
  onUpdate,
}: EditPositionDialogProps) {
  const { t } = useTranslation('asset-management');
  const [quantity, setQuantity] = useState('');
  const [averageCost, setAverageCost] = useState('');
  const [loading, setLoading] = useState(false);

  const updatePosition = usePositionStore((state) => state.updatePosition);

  // 初始化表单数据
  useEffect(() => {
    if (position && open) {
      setQuantity(position.quantity.toString());
      setAverageCost(position.averageCost.toString());
    }
  }, [position, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!position) return;

    setLoading(true);

    try {
      await updatePosition({
        id: position.id,
        quantity: parseFloat(quantity),
        averageCost: parseFloat(averageCost),
      });

      onOpenChange(false);

      // 更新成功后，通知父组件
      onUpdate();
    } catch (error) {
      console.error('Failed to update position:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('editDialog.title')}</DialogTitle>
            <DialogDescription>{t('editDialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="symbol" className="text-right">
                {t('editDialog.fields.symbol')}
              </Label>
              <div className="col-span-3">
                <Input id="symbol" value={position?.symbol || ''} disabled />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                {t('editDialog.fields.quantity')}
              </Label>
              <div className="col-span-3">
                <Input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="averageCost" className="text-right">
                {t('editDialog.fields.averageCost')}
              </Label>
              <div className="col-span-3">
                <Input
                  id="averageCost"
                  type="number"
                  step="0.01"
                  value={averageCost}
                  onChange={(e) => setAverageCost(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('editDialog.actions.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('editDialog.actions.saving') : t('editDialog.actions.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
