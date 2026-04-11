'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert';
import { Button } from '@renderer/components/ui/button';
import { Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import { Textarea } from '@renderer/components/ui/textarea';
import { useTranslation } from 'react-i18next';

interface InvestmentMemoViewProps {
  memo: string | null | undefined;
  onSave: (content: string) => Promise<void>;
  isEditing?: boolean;
  onEditChange?: (open: boolean) => void;
}

export function InvestmentMemoView({
  memo,
  onSave,
  isEditing = false,
  onEditChange,
}: InvestmentMemoViewProps) {
  const { t } = useTranslation('asset-meta');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  // 当进入编辑模式时，初始化内容
  useEffect(() => {
    if (isEditing) {
      setEditContent(memo || '');
    }
  }, [isEditing, memo]);

  const handleEdit = () => {
    onEditChange?.(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(editContent);
      onEditChange?.(false);
    } catch (error) {
      console.error('Failed to save memo:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    onEditChange?.(false);
  };

  if (!memo && !isEditing) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertTitle>{t('investmentMemo.emptyTitle')}</AlertTitle>
          <AlertDescription>{t('investmentMemo.emptyDescription')}</AlertDescription>
        </Alert>

        <Dialog open={isEditing} onOpenChange={onEditChange}>
          <DialogContent className="max-w-3xl flex flex-col max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{t('investmentMemo.addTitle')}</DialogTitle>
              <DialogDescription>{t('investmentMemo.addDescription')}</DialogDescription>
            </DialogHeader>
            <div className="py-4 flex-1 overflow-y-auto">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder={t('investmentMemo.placeholder')}
                className="h-full min-h-75 resize-none"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={saving}>
                {t('investmentMemo.buttons.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? t('investmentMemo.buttons.saving') : t('investmentMemo.buttons.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle>{t('investmentMemo.title')}</CardTitle>
            <CardDescription>{t('investmentMemo.description')}</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={handleEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{memo}</div>
        </CardContent>
      </Card>

      <Dialog open={isEditing} onOpenChange={onEditChange}>
        <DialogContent className="max-w-3xl flex flex-col max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{t('investmentMemo.editTitle')}</DialogTitle>
            <DialogDescription>{t('investmentMemo.editDescription')}</DialogDescription>
          </DialogHeader>
          <div className="py-4 flex-1 overflow-hidden">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder={t('investmentMemo.placeholder')}
              className="h-full min-h-75 resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={saving}>
              {t('investmentMemo.buttons.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t('investmentMemo.buttons.saving') : t('investmentMemo.buttons.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
