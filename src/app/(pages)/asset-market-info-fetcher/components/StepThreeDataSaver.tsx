'use client';

import { useState, useEffect } from 'react';
import { Button } from '@renderer/components/ui/button';
import { IconDatabase, IconLoader2, IconCheck, IconX } from '@tabler/icons-react';
import { MarketInformation } from '@typings/market';
import { post } from '@/app/lib/request/index';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import { Label } from '@renderer/components/ui/label';
import { Badge } from '@renderer/components/ui/badge';

interface StepThreeDataSaverProps {
  marketInfo: MarketInformation;
  analysisResult: Record<string, any> | null;
  onBack: () => void;
  onComplete: () => void;
  finalSaveResult: MarketInformation | null;
}

export function StepThreeDataSaver({
  marketInfo,
  analysisResult,
  onBack,
  onComplete,
  finalSaveResult,
}: StepThreeDataSaverProps) {
  const [isFinalSaving, setIsFinalSaving] = useState(false);
  const [finalSaveError, setFinalSaveError] = useState<string | null>(null);
  const [localFinalSaveResult, setLocalFinalSaveResult] = useState<MarketInformation | null>(
    finalSaveResult,
  );
  const [assets, setAssets] = useState<
    { id: number; symbol: string; chineseName: string | null }[]
  >([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  // 获取资产列表
  useEffect(() => {
    const fetchAssets = async () => {
      setIsLoadingAssets(true);
      try {
        const response = await fetch('/api/asset/meta');
        const result = await response.json();
        if (result.success) {
          setAssets(
            result.data.map((asset: any) => ({
              id: asset.id,
              symbol: asset.symbol,
              chineseName: asset.chineseName,
            })),
          );
        }
      } catch (error) {
        console.error('获取资产列表失败:', error);
      } finally {
        setIsLoadingAssets(false);
      }
    };

    fetchAssets();
  }, []);

  // 处理最终保存
  const handleFinalSave = async () => {
    if (!marketInfo || !analysisResult) return;

    // 检查是否选择了资产
    if (selectedAssetIds.length === 0) {
      setFinalSaveError('请选择要关联的资产');
      return;
    }

    setIsFinalSaving(true);
    setFinalSaveError(null);

    try {
      // 调用API保存市场信息分析结果
      const response = await post('/api/market-fetcher/save', {
        assetMetaIds: selectedAssetIds,
        title: analysisResult.title || '未提取到标题',
        symbol: analysisResult.symbol || '未知',
        sentiment: analysisResult.sentiment || '未知',
        importance: String(analysisResult.importance || 5),
        summary: analysisResult.summary || '未生成摘要',
        keyTopics: analysisResult.keyTopics ? JSON.stringify(analysisResult.keyTopics) : undefined,
        marketImpact: analysisResult.marketImpact || '未知',
        keyDataPoints: analysisResult.keyDataPoints
          ? JSON.stringify(analysisResult.keyDataPoints)
          : undefined,
        sourceUrl: marketInfo.metadata.url,
        sourceName: marketInfo.source.name,
        marketInfoId: marketInfo.id,
      });

      if (response.success) {
        setLocalFinalSaveResult(marketInfo);
        onComplete();
      } else {
        setFinalSaveError(response.message || '保存失败');
      }
    } catch (error) {
      setFinalSaveError(error instanceof Error ? error.message : '保存失败');
    } finally {
      setIsFinalSaving(false);
    }
  };

  const handleAssetSelect = (value: string) => {
    const id = Number(value);
    if (!selectedAssetIds.includes(id)) {
      setSelectedAssetIds([...selectedAssetIds, id]);
    }
  };

  const handleRemoveAsset = (id: number) => {
    setSelectedAssetIds(selectedAssetIds.filter((assetId) => assetId !== id));
  };

  return (
    <div className="space-y-4">
      {localFinalSaveResult ? (
        <div className="space-y-4">
          <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/20">
            <div className="flex items-center gap-2">
              <IconCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h3 className="text-lg font-medium text-green-800 dark:text-green-200">保存成功</h3>
            </div>
            <div className="mt-2 text-sm text-green-700 dark:text-green-300">
              <p>信息ID: {localFinalSaveResult.id}</p>
              <p>来源: {localFinalSaveResult.source.name}</p>
              <p>
                创建时间:{' '}
                {localFinalSaveResult.createdAt instanceof Date
                  ? localFinalSaveResult.createdAt.toString()
                  : localFinalSaveResult.createdAt}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={onComplete}>重新开始</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {finalSaveError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive dark:bg-destructive/20">
              {finalSaveError}
            </div>
          )}

          {/* 资产选择器移到上方 */}
          <div className="space-y-2">
            <Label htmlFor="asset-select">选择关联资产 (可多选)</Label>
            <Select
              onValueChange={handleAssetSelect}
              disabled={isLoadingAssets}
            >
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

          <div className="space-y-4">
            <div className="rounded-md bg-muted p-4">
              <h3 className="font-medium">确认保存以下信息</h3>
              <div className="mt-2 space-y-2 text-sm">
                <p>
                  <strong>标题:</strong>{' '}
                  {analysisResult?.title ||
                    marketInfo?.metadata?.extractedData?.title ||
                    '未提取到标题'}
                </p>
                <div>
                  <strong>资产代号:</strong> {analysisResult?.symbol || '未知'}
                </div>
                <p>
                  <strong>来源:</strong> {marketInfo?.source.name}
                </p>
                <p>
                  <strong>投资倾向:</strong> {analysisResult?.sentiment || '未知'}
                </p>
                <p>
                  <strong>重要性:</strong> {analysisResult?.importance || '未知'}/10
                </p>
                <div>
                  <strong>关键词:</strong>
                  <p className="mt-1">{analysisResult?.keyTopics?.join(', ') || '未生成关键词'}</p>
                </div>
                <div>
                  <strong>重要数据:</strong>
                  <p className="mt-1">
                    {analysisResult?.keyDataPoints?.join('\n\n') || '未生成重要数据'}
                  </p>
                </div>
                <div>
                  <strong>市场影响:</strong>
                  <p className="mt-1">{analysisResult?.marketImpact || '未知'}</p>
                </div>
                <div>
                  <strong>内容摘要:</strong>
                  <p className="mt-1">{analysisResult?.summary || '未生成摘要'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={onBack}>
              上一步
            </Button>
            <Button onClick={handleFinalSave} disabled={isFinalSaving || selectedAssetIds.length === 0}>
              {isFinalSaving ? (
                <>
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                '确认保存'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
