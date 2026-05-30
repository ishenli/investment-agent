'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@renderer/components/ui/button';
import { Textarea } from '@renderer/components/ui/textarea';
import { Badge } from '@renderer/components/ui/badge';
import { IconDeviceFloppy, IconRefresh, IconLock } from '@tabler/icons-react';
import { put, get } from '@/app/lib/request/index';
import { notificationManager } from '@/app/lib/notification';
import { useTranslation } from 'react-i18next';
import type { RuntimeAssetMeta } from '@typings/agentRuntimeAsset';

interface RuntimeAssetEditorProps {
  runtime: string;
  assetId: string;
  meta: RuntimeAssetMeta;
  initialContent: string;
}

export function RuntimeAssetEditor({
  runtime,
  assetId,
  meta,
  initialContent,
}: RuntimeAssetEditorProps) {
  const { t } = useTranslation('setting');
  const [content, setContent] = useState(initialContent);
  const [savedContent, setSavedContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);

  const isDirty = content !== savedContent;

  useEffect(() => {
    setContent(initialContent);
    setSavedContent(initialContent);
  }, [initialContent, runtime, assetId]);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      const response: { success: boolean; data?: { content: string }; message?: string } =
        await put('/api/agent/runtime-assets', {
          runtime,
          assetId,
          content,
        });

      if (response.success) {
        setSavedContent(content);
        notificationManager.toast({
          title: t('agent.runtimeAssets.saveSuccess', '保存成功'),
          variant: 'success',
        });
      } else {
        throw new Error(response.message || '保存失败');
      }
    } catch (err) {
      console.error('Failed to save asset', err);
      notificationManager.toast({
        title: t('agent.runtimeAssets.saveFailed', '保存失败'),
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  }, [runtime, assetId, content, t]);

  const handleReload = useCallback(async () => {
    try {
      const response: { success: boolean; data?: { content: string } } = await get(
        `/api/agent/runtime-assets?runtime=${runtime}&assetId=${assetId}`,
      );
      if (response.success && response.data) {
        setContent(response.data.content);
        setSavedContent(response.data.content);
      }
    } catch (err) {
      console.error('Failed to reload asset', err);
      notificationManager.toast({
        title: t('agent.runtimeAssets.reloadFailed', '重新加载失败'),
        variant: 'error',
      });
    }
  }, [runtime, assetId, t]);

  const handleCancel = useCallback(() => {
    setContent(savedContent);
  }, [savedContent]);

  if (meta.readOnly) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <IconLock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {t('agent.runtimeAssets.readOnly', '只读')}
          </span>
        </div>
        <Textarea
          value={content}
          readOnly
          className="min-h-[400px] font-mono text-sm resize-y"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {meta.exists ? (
            <Badge variant="outline" className="text-xs">
              {meta.sizeBytes != null
                ? `${(meta.sizeBytes / 1024).toFixed(1)} KB`
                : ''}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              {t('agent.runtimeAssets.newFile', '新文件')}
            </Badge>
          )}
          {isDirty && (
            <Badge variant="default" className="text-xs">
              {t('agent.runtimeAssets.unsaved', '未保存')}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleReload} disabled={saving}>
            <IconRefresh className="h-4 w-4" />
          </Button>
          {isDirty && (
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>
              {t('agent.runtimeAssets.cancel', '取消')}
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={!isDirty || saving}>
            <IconDeviceFloppy className="mr-1 h-4 w-4" />
            {saving
              ? t('agent.runtimeAssets.saving', '保存中...')
              : t('agent.runtimeAssets.save', '保存')}
          </Button>
        </div>
      </div>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[400px] font-mono text-sm resize-y"
        placeholder={t('agent.runtimeAssets.placeholder', '输入 Markdown 内容...')}
      />
    </div>
  );
}
