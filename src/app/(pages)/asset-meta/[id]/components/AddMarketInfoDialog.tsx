'use client';

import { useState, useEffect } from 'react';
import { Button } from '@renderer/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@renderer/components/ui/dialog';
import { Label } from '@renderer/components/ui/label';
import { Textarea } from '@renderer/components/ui/textarea';
import { Input } from '@renderer/components/ui/input';
import { Badge } from '@renderer/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import { IconX } from '@tabler/icons-react';
import { post } from '@/app/lib/request/index';

interface AddMarketInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetMetaId?: number; // 可选的资产ID，用于预选资产
  onSuccess?: () => void; // 保存成功后的回调
  onCancel?: () => void; // 取消时的回调
}

interface Asset {
  id: number;
  symbol: string;
  chineseName: string | null;
}

export function AddMarketInfoDialog({
  open,
  onOpenChange,
  assetMetaId,
  onSuccess,
  onCancel,
}: AddMarketInfoDialogProps) {
  const [contentMode, setContentMode] = useState<'ai_summary' | 'original'>('original'); // 默认为原文模式
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);
  const [title, setTitle] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取资产列表
  useEffect(() => {
    if (!open) return;

    const fetchAssets = async () => {
      setIsLoadingAssets(true);
      setError(null);
      
      try {
        const response = await fetch('/api/asset/meta');
        const result = await response.json();
        
        if (result.success) {
          const fetchedAssets = result.data.map((asset: any) => ({
            id: asset.id,
            symbol: asset.symbol,
            chineseName: asset.chineseName,
          }));
          
          setAssets(fetchedAssets);
          
          // 如果传入了assetMetaId，自动选中该资产
          if (assetMetaId) {
            const assetExists = fetchedAssets.some((asset: Asset) => asset.id === assetMetaId);
            if (assetExists) {
              setSelectedAssetIds([assetMetaId]);
            }
          }
        } else {
          setError(result.message || '获取资产列表失败');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取资产列表失败');
      } finally {
        setIsLoadingAssets(false);
      }
    };

    fetchAssets();
  }, [open, assetMetaId]);

  // 重置表单
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setContentMode('original');
    setSelectedAssetIds(assetMetaId ? [assetMetaId] : []);
    setTitle('');
    setOriginalContent('');
    setSourceUrl('');
    setSourceName('');
    setIsLoading(false);
    setError(null);
  };

  const handleAssetSelect = (value: string) => {
    const id = Number(value);
    if (!selectedAssetIds.includes(id)) {
      setSelectedAssetIds([...selectedAssetIds, id]);
    }
  };

  const handleRemoveAsset = (id: number) => {
    setSelectedAssetIds(selectedAssetIds.filter(assetId => assetId !== id));
  };

  const handleSubmit = async () => {
    setError(null);

    // 验证必填字段
    if (selectedAssetIds.length === 0) {
      setError('请选择至少一个关联资产');
      return;
    }

    if (!title.trim()) {
      setError('请输入标题');
      return;
    }

    if (contentMode === 'original' && !originalContent.trim()) {
      setError('请输入原文内容');
      return;
    }

    // 检查原文长度
    if (contentMode === 'original' && originalContent.length > 100 * 1024) { // 100KB
      setError('原文内容不能超过100KB');
      return;
    }

    setIsLoading(true);

    try {
      const payload: any = {
        assetMetaIds: selectedAssetIds,
        title: title.trim(),
        symbol: assets.filter(a => selectedAssetIds.includes(a.id)).map(a => a.symbol).join(','),
        sentiment: 'neutral', // 默认值
        importance: '5', // 默认值
        summary: originalContent.substring(0, 200) + '...', // 使用原文前200字符作为摘要预览
        sourceUrl: sourceUrl.trim() || undefined,
        sourceName: sourceName.trim() || undefined,
        originalContent: contentMode === 'original' ? originalContent.trim() : undefined,
        contentMode: contentMode,
      };

      // 如果是原文模式，使用原文内容作为摘要
      if (contentMode === 'original') {
        payload.summary = originalContent.substring(0, 200) + '...';
      }

      const response = await post('/api/market-fetcher/save', payload);

      if (response.success) {
        onSuccess?.();
        onOpenChange(false);
      } else {
        setError(response.message || '保存失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    onCancel?.();
  };

  const charCount = originalContent.length;
  const isOverLimit = charCount > 100 * 1024; // 100KB

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>添加市场纪要</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive dark:bg-destructive/20">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* 内容模式选择器 */}
          <div className="space-y-2">
            <Label>内容处理模式</Label>
            <div className="flex rounded-md border border-input p-1">
              <button
                className={`flex-1 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                  contentMode === 'ai_summary'
                    ? 'bg-primary text-primary-foreground shadow'
                    : 'hover:bg-accent hover:text-accent-foreground'
                }`}
                onClick={() => setContentMode('ai_summary')}
              >
                AI摘要模式
              </button>
              <button
                className={`flex-1 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                  contentMode === 'original'
                    ? 'bg-primary text-primary-foreground shadow'
                    : 'hover:bg-accent hover:text-accent-foreground'
                }`}
                onClick={() => setContentMode('original')}
              >
                原文保留模式
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {contentMode === 'ai_summary'
                ? '保存AI分析结果'
                : '直接保存原文内容，跳过AI分析'}
            </p>
          </div>

          {/* 资产选择器 */}
          <div className="space-y-2">
            <Label htmlFor="asset-select">选择关联资产 (可多选)</Label>
            <Select onValueChange={handleAssetSelect} disabled={isLoadingAssets}>
              <SelectTrigger id="asset-select">
                <SelectValue placeholder={isLoadingAssets ? '加载中...' : '添加关联资产'} />
              </SelectTrigger>
              <SelectContent>
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id.toString()}>
                    {asset.symbol} {asset.chineseName ? `(${asset.chineseName})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedAssetIds.map((id) => {
                const asset = assets.find((a) => a.id === id);
                if (!asset) return null;
                return (
                  <Badge key={id} variant="secondary" className="flex items-center gap-1">
                    {asset.symbol}
                    <button
                      onClick={() => handleRemoveAsset(id)}
                      className="ml-1 rounded-full hover:bg-muted p-0.5"
                    >
                      <IconX className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>

            {selectedAssetIds.length === 0 && (
              <p className="text-sm text-muted-foreground">请选择至少一个要关联的资产</p>
            )}
          </div>

          {/* 标题输入 */}
          <div className="space-y-2">
            <Label htmlFor="title">标题 *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入市场纪要标题"
              disabled={isLoading}
            />
          </div>

          {/* 原文内容输入 - 仅在原文模式下显示 */}
          {contentMode === 'original' && (
            <div className="space-y-2">
              <Label htmlFor="originalContent">原文内容 *</Label>
              <Textarea
                id="originalContent"
                value={originalContent}
                onChange={(e) => setOriginalContent(e.target.value)}
                placeholder="请输入原始文章内容..."
                rows={10}
                disabled={isLoading}
                className={isOverLimit ? 'border-destructive' : ''}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>字符数: {charCount.toLocaleString()}</span>
                <span className={isOverLimit ? 'text-destructive' : ''}>
                  限制: {(100 * 1024).toLocaleString()} 字符
                </span>
              </div>
              {isOverLimit && (
                <p className="text-xs text-destructive">
                  内容超出限制，请减少内容长度
                </p>
              )}
            </div>
          )}

          {/* AI摘要模式字段 - 仅在AI摘要模式下显示 */}
          {contentMode === 'ai_summary' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="summary">内容摘要</Label>
                <Textarea
                  id="summary"
                  value=""
                  onChange={() => {}}
                  placeholder="AI分析后的内容摘要将在此显示"
                  rows={4}
                  disabled={true}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>投资倾向</Label>
                  <Input value="" placeholder="AI分析结果" disabled={true} />
                </div>
                
                <div className="space-y-2">
                  <Label>重要性</Label>
                  <Input value="" placeholder="AI分析结果" disabled={true} />
                </div>
              </div>
            </div>
          )}

          {/* 来源信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sourceUrl">来源URL</Label>
              <Input
                id="sourceUrl"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://example.com/article"
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sourceName">来源名称</Label>
              <Input
                id="sourceName"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="来源网站名称"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}