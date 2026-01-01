'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card';
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

interface InvestmentMemoViewProps {
  memo: string | null | undefined;
  onSave: (content: string) => Promise<void>;
  isEditing?: boolean;
  onEditChange?: (open: boolean) => void;
}

export function InvestmentMemoView({ memo, onSave, isEditing = false, onEditChange }: InvestmentMemoViewProps) {
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
          <AlertTitle>暂无数据</AlertTitle>
          <AlertDescription>当前没有投资笔记信息。</AlertDescription>
        </Alert>

        <Dialog open={isEditing} onOpenChange={onEditChange}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>编辑投资笔记</DialogTitle>
              <DialogDescription>
                请输入关于该资产的投资分析和笔记
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="请输入投资笔记..."
                className="min-h-[300px]"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={saving}>
                取消
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? '保存中...' : '保存'}
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
            <CardTitle>投资笔记</CardTitle>
            <CardDescription>
              关于该资产的投资分析和笔记
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={handleEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {memo}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditing} onOpenChange={onEditChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>编辑投资笔记</DialogTitle>
            <DialogDescription>
              请输入关于该资产的投资分析和笔记
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="请输入投资笔记..."
              className="min-h-[300px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={saving}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
