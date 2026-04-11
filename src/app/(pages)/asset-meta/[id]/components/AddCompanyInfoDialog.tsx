'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import { Input } from '@renderer/components/ui/input';
import { Textarea } from '@renderer/components/ui/textarea';
import { Button } from '@renderer/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AddCompanyInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (title: string, content: string, id?: number) => Promise<void>;
  saving: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  initialData?: {
    id: number;
    title: string;
    content: string;
  } | null;
}

export function AddCompanyInfoDialog({
  open,
  onOpenChange,
  onSave,
  saving,
  error,
  setError,
  initialData,
}: AddCompanyInfoDialogProps) {
  const { t } = useTranslation('asset-meta');
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [content, setContent] = useState(initialData?.content ?? '');

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      setError(t('companyInfo.validation.titleAndContentRequired'));
      return;
    }

    await onSave(title, content, initialData?.id);

    // 如果保存成功，清空表单
    setTitle('');
    setContent('');
  };

  const handleClose = () => {
    onOpenChange(false);
    setTitle('');
    setContent('');
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{initialData ? t('companyInfo.editTitle') : t('companyInfo.addTitle')}</DialogTitle>
          <DialogDescription>{t('companyInfo.description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 flex-1 overflow-y-auto">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('companyInfo.error')}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              {t('companyInfo.fields.title')}
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('companyInfo.placeholders.title')}
              disabled={saving}
            />
          </div>
          <div className="flex flex-col space-y-2">
            <label htmlFor="content" className="text-sm font-medium">
              {t('companyInfo.fields.content')}
            </label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('companyInfo.placeholders.content')}
              className="min-h-75 resize-none"
              disabled={saving}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            {t('companyInfo.buttons.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving || !title.trim() || !content.trim()}>
            {saving ? t('companyInfo.buttons.saving') : t('companyInfo.buttons.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
