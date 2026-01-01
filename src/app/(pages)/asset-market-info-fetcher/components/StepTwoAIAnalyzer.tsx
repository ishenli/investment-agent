'use client';

import { useState } from 'react';
import { Button } from '@renderer/components/ui/button';
import { IconLoader2 } from '@tabler/icons-react';
import { MarketInformation } from '@typings/market';
import { put } from '@/app/lib/request/index';

interface StepTwoAIAnalyzerProps {
  marketInfo: MarketInformation;
  onBack: () => void;
  onNext: (analysis: Record<string, any>) => void;
  analysisResult: Record<string, any> | null;
}

export function StepTwoAIAnalyzer({
  marketInfo,
  onBack,
  onNext,
  analysisResult,
}: StepTwoAIAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [localAnalysisResult, setLocalAnalysisResult] = useState<Record<string, any> | null>(
    analysisResult,
  );

  // 处理AI分析
  const handleAnalyze = async () => {
    if (!marketInfo) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // 调用AI分析API
      const result = await put('/api/market-fetcher/ai', {
        content: marketInfo.content,
        title: marketInfo.metadata?.extractedData?.title,
        language: 'zh',
      });

      if (result.success) {
        // 使用API返回的分析结果
        const analysisData = result.data.data;
        setLocalAnalysisResult(analysisData);
      } else {
        setAnalysisError(result.error || 'AI分析失败');
      }
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : '分析失败');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      {localAnalysisResult ? (
        <div className="space-y-4">
          <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
            <h3 className="text-lg font-medium text-blue-800 dark:text-blue-200">AI分析完成</h3>
            <div className="mt-2 space-y-2 text-sm text-blue-700 dark:text-blue-300">
              <p>
                <strong>标题:</strong>{' '}
                {localAnalysisResult.title || localAnalysisResult.analysis?.title || '未提取到标题'}
              </p>
              <div>
                <strong>资产代号:{localAnalysisResult.symbol || '未知'} </strong>
              </div>
              <p>
                <strong>投资倾向:</strong>{' '}
                {localAnalysisResult.sentiment || localAnalysisResult.analysis?.sentiment || '未知'}
              </p>
              <p>
                <strong>重要性评分:</strong>{' '}
                {localAnalysisResult.importance ||
                  localAnalysisResult.analysis?.importance ||
                  '未知'}
                /10
              </p>
              <div>
                <strong>关键词:</strong>
                <p className="mt-1">{localAnalysisResult.keyTopics.join(', ') || '未生成关键词'}</p>
              </div>
              <div>
                <strong>重要数据:</strong>
                <p className="mt-1">
                  {localAnalysisResult.keyDataPoints.join('\n\n') || '未生成重要数据'}
                </p>
              </div>
              <div>
                <strong>市场影响:</strong>
                <p className="mt-1">
                  {localAnalysisResult.marketImpact ||
                    localAnalysisResult.analysis?.marketImpact ||
                    '未知'}
                </p>
              </div>
              <div>
                <strong>内容摘要:</strong>
                <p className="mt-1">
                  {localAnalysisResult.summary ||
                    localAnalysisResult.analysis?.summary ||
                    '未生成摘要'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={onBack}>
              上一步
            </Button>
            <div className="space-x-2">
              <Button variant="outline" onClick={handleAnalyze} disabled={isAnalyzing}>
                {isAnalyzing ? (
                  <>
                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                    重新分析中...
                  </>
                ) : (
                  '重新分析'
                )}
              </Button>
              <Button onClick={() => onNext(localAnalysisResult)}>下一步: 保存数据</Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {analysisError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive dark:bg-destructive/20">
              {analysisError}
            </div>
          )}

          <div className="rounded-md bg-muted p-4">
            <h3 className="font-medium">内容预览</h3>
            <div className="mt-2 max-h-40 overflow-y-auto text-sm">
              <p>{marketInfo?.content.substring(0, 1000)}...</p>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={onBack}>
              上一步
            </Button>
            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  AI分析中...
                </>
              ) : (
                '开始AI分析'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
