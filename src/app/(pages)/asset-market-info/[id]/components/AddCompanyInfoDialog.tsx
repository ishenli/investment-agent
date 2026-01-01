'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog';
import { Input } from '@renderer/components/ui/input';
import { Textarea } from '@renderer/components/ui/textarea';
import { Button } from '@renderer/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert';
import { AlertCircle } from 'lucide-react';

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
  initialData
}: AddCompanyInfoDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (open && initialData) {
      setTitle(initialData.title);
      setContent(initialData.content);
    } else if (open && !initialData) {
      setTitle('');
      setContent('');
    }
  }, [open, initialData]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      setError('标题和内容不能为空');
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initialData ? '编辑公司纪要' : '添加公司纪要'}</DialogTitle>
          <DialogDescription>
            请输入公司纪要的标题和内容
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>错误</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              标题
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入标题"
              disabled={saving}
            />
          </div>
          <div className="flex flex-col space-y-2">
            <label htmlFor="content" className="text-sm font-medium">
              内容
            </label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="请输入内容"
              rows={6}
              style={{
                height: '300px'
              }}
              disabled={saving}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={saving}
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !title.trim() || !content.trim()}
          >
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}