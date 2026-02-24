'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import { Button } from '@renderer/components/ui/button';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

type AssetMarketInfoType = {
  id: number;
  assetMetaIds: number[];
  title: string;
  symbol: string;
  sentiment: string;
  importance: string;
  summary: string;
  keyTopics: string | null;
  marketImpact: string;
  keyDataPoints: string | null;
  sourceUrl: string | null;
  sourceName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type AssetCompanyInfoType = {
  id: number;
  assetMetaId: number;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  deleting: boolean;
  infoToDelete: AssetMarketInfoType | null;
  companyInfoToDelete: AssetCompanyInfoType | null;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  deleting,
  infoToDelete,
  companyInfoToDelete,
}: DeleteConfirmationDialogProps) {
  const { t } = useTranslation('asset-meta');
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('detail.delete.dialog.title')}</DialogTitle>
          <DialogDescription>
            {t('detail.delete.dialog.description')}
            {infoToDelete && (
              <div className="mt-2 p-2 bg-muted rounded">
                <p className="font-medium">{infoToDelete.title}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(infoToDelete.createdAt), 'yyyy年MM月dd日 HH:mm', {
                    locale: zhCN,
                  })}
                </p>
              </div>
            )}
            {companyInfoToDelete && (
              <div className="mt-2 p-2 bg-muted rounded">
                <p className="font-medium">{companyInfoToDelete.title}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(companyInfoToDelete.createdAt), 'yyyy年MM月dd日 HH:mm', {
                    locale: zhCN,
                  })}
                </p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={deleting}>
            {t('detail.delete.dialog.cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? t('detail.delete.dialog.deleting') : t('detail.delete.dialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
