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
import { toast } from 'sonner';
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

interface EditReportDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  initialContent: string;
  onUpdate: () => void;
}

export function EditReportDrawer({
  open,
  onOpenChange,
  reportId,
  initialContent,
  onUpdate,
}: EditReportDrawerProps) {
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
      toast.error('内容不能为空');
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
        toast.success('报告已更新');
        onOpenChange(false);
        onUpdate();
      } else {
        toast.error(result.message || '更新报告失败');
      }
    } catch (error) {
      toast.error('更新报告失败');
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
            <DrawerTitle className="text-xl">编辑报告</DrawerTitle>
            <DrawerDescription>编辑报告内容，支持 Markdown 格式。</DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-auto px-4">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[calc(100dvh-200px)] sm:min-h-[calc(100vh-180px)] font-mono text-sm"
              placeholder="输入报告内容..."
            />
          </div>

          <DrawerFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
              取消
            </Button>
            <Button type="button" onClick={handleSave} disabled={loading || !content.trim()}>
              {loading ? '保存中...' : '保存'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* 未保存更改确认对话框 */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>放弃更改？</AlertDialogTitle>
            <AlertDialogDescription>
              您有未保存的更改，确定要放弃这些更改吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>继续编辑</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDiscard}>放弃更改</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
