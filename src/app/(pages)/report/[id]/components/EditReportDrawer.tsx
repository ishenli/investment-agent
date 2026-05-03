'use client';

import { useState, useEffect } from 'react';
import { Button } from '@renderer/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@renderer/components/ui/drawer';
import { Textarea } from '@renderer/components/ui/textarea';
import { notificationManager } from '@/app/lib/notification';
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
import { useTranslation } from 'react-i18next';

interface EditReportDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  initialContent: string;
  onUpdate: () => void;
}

/**
 * Renders a right-side drawer that allows editing a report's Markdown content and saving changes to the server.
 *
 * @param open - Whether the drawer is open
 * @param onOpenChange - Callback to change the drawer open state; called with `false` to close
 * @param reportId - Identifier of the report to update
 * @param initialContent - Initial text to populate the editor when the drawer opens
 * @param onUpdate - Callback invoked after the report is successfully updated
 * @returns The drawer React element for editing a report
 */
export function EditReportDrawer({
  open,
  onOpenChange,
  reportId,
  initialContent,
  onUpdate,
}: EditReportDrawerProps) {
  const { t } = useTranslation('report');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 初始化内容
  useEffect(() => {
    if (open) {
      setContent(initialContent);
      setHasUnsavedChanges(false);
    }
  }, [open, initialContent]);

  // 监听内容变化
  useEffect(() => {
    setHasUnsavedChanges(content !== initialContent);
  }, [content, initialContent]);

  const handleSave = async () => {
    if (!content.trim()) {
      notificationManager.toast({ title: t('editDrawer.contentEmpty'), variant: 'error' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/report/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        notificationManager.toast({ title: t('editDrawer.updateSuccess'), variant: 'success' });
        onOpenChange(false);
        onUpdate();
      } else {
        notificationManager.toast({ title: result.message || t('editDrawer.updateFailed'), variant: 'error' });
      }
    } catch (error) {
      notificationManager.toast({ title: t('editDrawer.updateFailed'), variant: 'error' });
      console.error('Failed to update report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleConfirmDiscard = () => {
    setShowUnsavedDialog(false);
    onOpenChange(false);
  };

  return (
    <>
      <Drawer open={open} onOpenChange={handleCancel} direction="right">
        <DrawerContent className="h-dvh sm:max-w-[800px] sm:h-screen rounded-none">
          <DrawerHeader>
            <DrawerTitle className="text-xl">{t('editDrawer.title')}</DrawerTitle>
            <DrawerDescription>{t('editDrawer.description')}</DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-auto px-4">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[calc(100dvh-200px)] sm:min-h-[calc(100vh-180px)] font-mono text-sm"
              placeholder={t('editDrawer.placeholder')}
            />
          </div>

          <DrawerFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
              {t('editDrawer.cancel')}
            </Button>
            <Button type="button" onClick={handleSave} disabled={loading || !content.trim()}>
              {loading ? t('editDrawer.saving') : t('editDrawer.save')}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* 未保存更改确认对话框 */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('editDrawer.discardTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('editDrawer.discardDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('editDrawer.continueEditing')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDiscard}>{t('editDrawer.discard')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}