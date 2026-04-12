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
import { useTranslation } from 'react-i18next';

interface StepThreeDataSaverProps {
  marketInfo: MarketInformation;
  analysisResult: Record<string, any> | null;
  onBack: () => void;
  onComplete: () => void;
  finalSaveResult: MarketInformation | null;
  initialAssetMetaId?: number;
}

export function StepThreeDataSaver({
  marketInfo,
  analysisResult,
  onBack,
  onComplete,
  finalSaveResult,
  initialAssetMetaId,
}: StepThreeDataSaverProps) {
  const { t } = useTranslation('asset-market-info-fetcher');
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
  const [contentMode, setContentMode] = useState<'ai_summary' | 'original'>('ai_summary'); // 默认为AI摘要模式

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
          // 若从资产详情页跳转而来，则预选该资产
          if (initialAssetMetaId) {
            setSelectedAssetIds([initialAssetMetaId]);
          }
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
      setFinalSaveError(t('steps.step3.assetSelect.noSelection'));
      return;
    }

    setIsFinalSaving(true);
    setFinalSaveError(null);

    try {
      // 调用API保存市场信息分析结果
      const response = await post('/api/market-fetcher/save', {
        assetMetaIds: selectedAssetIds,
        title: contentMode === 'ai_summary' && analysisResult?.title 
          ? analysisResult.title 
          : marketInfo.metadata.extractedData?.title || t('error.unknown'),
        symbol: contentMode === 'ai_summary' && analysisResult?.symbol 
          ? analysisResult.symbol 
          : marketInfo.metadata.extractedData?.symbol || '未知',
        sentiment: contentMode === 'ai_summary' && analysisResult?.sentiment 
          ? analysisResult.sentiment 
          : 'neutral',
        importance: contentMode === 'ai_summary' && analysisResult?.importance 
          ? String(analysisResult.importance) 
          : '5',
        summary: contentMode === 'ai_summary' && analysisResult?.summary 
          ? analysisResult.summary 
          : marketInfo.content.substring(0, 200) + '...',
        keyTopics: contentMode === 'ai_summary' && analysisResult?.keyTopics 
          ? JSON.stringify(analysisResult.keyTopics) 
          : undefined,
        marketImpact: contentMode === 'ai_summary' && analysisResult?.marketImpact 
          ? analysisResult.marketImpact 
          : '未知',
        keyDataPoints: contentMode === 'ai_summary' && analysisResult?.keyDataPoints
          ? JSON.stringify(analysisResult.keyDataPoints)
          : undefined,
        sourceUrl: marketInfo.metadata.url,
        sourceName: marketInfo.source.name,
        marketInfoId: marketInfo.id,
        contentMode: contentMode,
      });

      if (response.success) {
        setLocalFinalSaveResult(marketInfo);
        onComplete();
      } else {
        setFinalSaveError(response.message || t('error.saveFailed'));
      }
    } catch (error) {
      setFinalSaveError(error instanceof Error ? error.message : t('error.unknown'));
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
              <h3 className="text-lg font-medium text-green-800 dark:text-green-200">{t('steps.step3.saveSuccess.title')}</h3>
            </div>
            <div className="mt-2 text-sm text-green-700 dark:text-green-300">
              <p>{t('steps.step3.saveSuccess.infoId')}: {localFinalSaveResult.id}</p>
              <p>{t('steps.step3.saveSuccess.source')}: {localFinalSaveResult.source.name}</p>
              <p>
                {t('steps.step3.saveSuccess.createdAt')}:{' '}
                {localFinalSaveResult.createdAt instanceof Date
                  ? localFinalSaveResult.createdAt.toString()
                  : localFinalSaveResult.createdAt}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={onComplete}>{t('steps.step3.actions.restart')}</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {finalSaveError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive dark:bg-destructive/20">
              {finalSaveError}
            </div>
          )}

          {/* 内容模式选择器 */}
          <div className="space-y-2">
            <Label>{t('steps.step3.contentMode.label')}</Label>
            <div className="flex rounded-md border border-input p-1">
              <button
                className={`flex-1 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                  contentMode === 'ai_summary'
                    ? 'bg-primary text-primary-foreground shadow'
                    : 'hover:bg-accent hover:text-accent-foreground'
                }`}
                onClick={() => setContentMode('ai_summary')}
              >
                {t('steps.step3.contentMode.aiSummary')}
              </button>
              <button
                className={`flex-1 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                  contentMode === 'original'
                    ? 'bg-primary text-primary-foreground shadow'
                    : 'hover:bg-accent hover:text-accent-foreground'
                }`}
                onClick={() => setContentMode('original')}
              >
                {t('steps.step3.contentMode.original')}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {contentMode === 'ai_summary'
                ? t('steps.step3.contentMode.aiSummaryDesc')
                : t('steps.step3.contentMode.originalDesc')}
            </p>
          </div>

          {/* 资产选择器移到上方 */}
          <div className="space-y-2">
            <Label htmlFor="asset-select">{t('steps.step3.assetSelect.label')}</Label>
            <Select onValueChange={handleAssetSelect} disabled={isLoadingAssets}>
              <SelectTrigger id="asset-select">
                <SelectValue placeholder={isLoadingAssets ? t('steps.step3.assetSelect.loading') : t('steps.step3.assetSelect.placeholder')} />
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
              <p className="text-sm text-muted-foreground">{t('steps.step3.assetSelect.noSelection')}</p>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-md bg-muted p-4">
              <h3 className="font-medium">{t('steps.step3.confirmInfo')}</h3>
              <div className="mt-2 space-y-2 text-sm">
                {contentMode === 'ai_summary' ? (
                  // AI摘要模式预览
                  <>
                    <p>
                      <strong>{t('steps.step2.analyzeSuccess.titleLabel')}:</strong>{' '}
                      {analysisResult?.title ||
                        marketInfo?.metadata?.extractedData?.title ||
                        t('error.unknown')}
                    </p>
                    <div>
                      <strong>{t('steps.step2.analyzeSuccess.symbol')}: </strong> {analysisResult?.symbol || '未知'}
                    </div>
                    <p>
                      <strong>{t('steps.step3.saveSuccess.source')}:</strong> {marketInfo?.source.name}
                    </p>
                    <p>
                      <strong>{t('steps.step2.analyzeSuccess.sentiment')}:</strong> {analysisResult?.sentiment || '未知'}
                    </p>
                    <p>
                      <strong>{t('steps.step2.analyzeSuccess.importance')}:</strong> {analysisResult?.importance || '未知'}/10
                    </p>
                    <div>
                      <strong>{t('steps.step2.analyzeSuccess.keywords')}:</strong>
                      <p className="mt-1">{analysisResult?.keyTopics?.join(', ') || t('error.unknown')}</p>
                    </div>
                    <div>
                      <strong>{t('steps.step2.analyzeSuccess.keyData')}:</strong>
                      <p className="mt-1">
                        {analysisResult?.keyDataPoints?.join('\n\n') || t('error.unknown')}
                      </p>
                    </div>
                    <div>
                      <strong>{t('steps.step2.analyzeSuccess.marketImpact')}:</strong>
                      <p className="mt-1">{analysisResult?.marketImpact || '未知'}</p>
                    </div>
                    <div>
                      <strong>{t('steps.step2.analyzeSuccess.summary')}:</strong>
                      <p className="mt-1">{analysisResult?.summary || t('error.unknown')}</p>
                    </div>
                  </>
                ) : (
                  // 原文模式预览
                  <>
                    <p>
                      <strong>{t('steps.step2.analyzeSuccess.titleLabel')}:</strong>{' '}
                      {marketInfo?.metadata?.extractedData?.title || t('error.unknown')}
                    </p>
                    <div>
                      <strong>{t('steps.step2.analyzeSuccess.symbol')}: </strong> {marketInfo?.metadata?.extractedData?.symbol || '未知'}
                    </div>
                    <p>
                      <strong>{t('steps.step3.saveSuccess.source')}:</strong> {marketInfo?.source.name}
                    </p>
                    <div>
                      <strong>{t('steps.step2.contentPreview')}:</strong>
                      <p className="mt-1 max-h-40 overflow-y-auto">
                        {marketInfo?.content || t('error.unknown')}
                      </p>
                    </div>
                    <div>
                      <strong>{t('steps.step1.crawlSuccess.contentLength')}:</strong>{' '}
                      <span>{marketInfo?.content?.length || 0} {t('steps.step1.crawlSuccess.contentLength')}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={onBack}>
              {t('steps.step3.actions.back')}
            </Button>
            <Button
              onClick={handleFinalSave}
              disabled={isFinalSaving || selectedAssetIds.length === 0}
            >
              {isFinalSaving ? (
                <>
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('steps.step3.actions.saving')}
                </>
              ) : (
                t('steps.step3.actions.save')
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
