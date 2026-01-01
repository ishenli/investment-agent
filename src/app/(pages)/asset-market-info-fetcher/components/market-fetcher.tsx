'use client';

import { useState } from 'react';
import {
  Stepper,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperSeparator,
  StepperTitle,
  StepperDescription,
  StepperNav,
  StepperContent,
} from '@renderer/components/ui/stepper';
import {
  IconWorld,
  IconFileText,
  IconCheck,
  IconSparkles,
  IconDatabase,
} from '@tabler/icons-react';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { MarketInformation } from '@typings/market';
import { StepOneContentFetcher } from './StepOneContentFetcher';
import { StepTwoAIAnalyzer } from './StepTwoAIAnalyzer';
import { StepThreeDataSaver } from './StepThreeDataSaver';

export function CombinedStepperMarketFetcher() {
  const [activeStep, setActiveStep] = useState(1);
  const [inputMode, setInputMode] = useState<'url' | 'manual' | null>(null);

  // 数据状态
  const [crawlResult, setCrawlResult] = useState<MarketInformation | null>(null);
  const [saveManualResult, setSaveManualResult] = useState<MarketInformation | null>(null);
  const [analysisResult, setAnalysisResult] = useState<Record<string, any> | null>(null);
  const [finalSaveResult, setFinalSaveResult] = useState<MarketInformation | null>(null);

  // 重置表单
  const resetForms = () => {
    // 重置所有状态
    setInputMode(null);
    setCrawlResult(null);
    setSaveManualResult(null);
    setAnalysisResult(null);
    setFinalSaveResult(null);
    setActiveStep(1);
  };

  // 获取当前的市场信息对象
  const getCurrentMarketInfo = () => {
    return inputMode === 'url' ? crawlResult : saveManualResult;
  };

  // 处理步骤1完成
  const handleStepOneComplete = (result: MarketInformation) => {
    if (inputMode === 'url') {
      setCrawlResult(result);
      // 重置分析结果，因为内容已更改
      setAnalysisResult(null);
    } else {
      setSaveManualResult(result);
      // 重置分析结果，因为内容已更改
      setAnalysisResult(null);
    }
    setActiveStep(2);
  };

  // 处理步骤2完成
  const handleStepTwoComplete = (analysis: Record<string, any>) => {
    setAnalysisResult(analysis);
    setActiveStep(3);
  };

  // 处理步骤3完成
  const handleStepThreeComplete = () => {
    setFinalSaveResult(getCurrentMarketInfo());
    resetForms();
  };

  // 控制步骤切换的函数
  const handleStepChange = (step: number) => {
    // 只有在满足条件时才允许切换到指定步骤
    if (step === 1) {
      // 总是允许回到第一步
      setActiveStep(step);
    } else if (step === 2) {
      // 只有在第一步完成后才允许进入第二步
      if (getCurrentMarketInfo()) {
        setActiveStep(step);
      }
    } else if (step === 3) {
      // 只有在第二步完成后才允许进入第三步
      if (analysisResult) {
        setActiveStep(step);
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">市场信息抓取工具</CardTitle>
        </CardHeader>
        <CardContent>
          <Stepper value={activeStep} onValueChange={handleStepChange} className="w-full">
            <StepperNav className="mb-8">
              <StepperItem step={1} completed={activeStep > 1}>
                <StepperTrigger>
                  <StepperIndicator>
                    {activeStep === 1 ? (
                      inputMode === 'url' ? (
                        <IconWorld className="h-4 w-4" />
                      ) : inputMode === 'manual' ? (
                        <IconFileText className="h-4 w-4" />
                      ) : (
                        <span className="text-xs">1</span>
                      )
                    ) : (
                      <IconCheck className="h-4 w-4" />
                    )}
                  </StepperIndicator>
                  <div className="flex flex-col items-start">
                    <StepperTitle>获取内容</StepperTitle>
                    <StepperDescription>选择输入方式并获取内容</StepperDescription>
                  </div>
                </StepperTrigger>
                <StepperSeparator />
              </StepperItem>

              <StepperItem step={2} completed={activeStep > 2}>
                <StepperTrigger>
                  <StepperIndicator>
                    {activeStep === 2 ? (
                      <IconSparkles className="h-4 w-4" />
                    ) : activeStep > 2 ? (
                      <IconCheck className="h-4 w-4" />
                    ) : (
                      <span className="text-xs">2</span>
                    )}
                  </StepperIndicator>
                  <div className="flex flex-col items-start">
                    <StepperTitle>AI分析</StepperTitle>
                    <StepperDescription>让AI总结和归纳内容</StepperDescription>
                  </div>
                </StepperTrigger>
                <StepperSeparator />
              </StepperItem>

              <StepperItem step={3}>
                <StepperTrigger>
                  <StepperIndicator>
                    {activeStep === 3 ? (
                      <IconDatabase className="h-4 w-4" />
                    ) : activeStep > 3 ? (
                      <IconCheck className="h-4 w-4" />
                    ) : (
                      <span className="text-xs">3</span>
                    )}
                  </StepperIndicator>
                  <div className="flex flex-col items-start">
                    <StepperTitle>保存数据</StepperTitle>
                    <StepperDescription>确认并保存到数据库</StepperDescription>
                  </div>
                </StepperTrigger>
              </StepperItem>
            </StepperNav>

            {/* 步骤1: 获取内容 */}
            <StepperContent value={1} className="space-y-4">
              <StepOneContentFetcher
                inputMode={inputMode}
                setInputMode={setInputMode}
                onNext={handleStepOneComplete}
              />
            </StepperContent>

            {/* 步骤2: AI分析 */}
            <StepperContent value={2} className="space-y-4">
              {getCurrentMarketInfo() && (
                <StepTwoAIAnalyzer
                  marketInfo={getCurrentMarketInfo()!}
                  onBack={() => setActiveStep(1)}
                  onNext={handleStepTwoComplete}
                  analysisResult={analysisResult}
                />
              )}
            </StepperContent>

            {/* 步骤3: 保存数据 */}
            <StepperContent value={3} className="space-y-4">
              {getCurrentMarketInfo() && analysisResult && (
                <StepThreeDataSaver
                  marketInfo={getCurrentMarketInfo()!}
                  analysisResult={analysisResult}
                  onBack={() => setActiveStep(2)}
                  onComplete={handleStepThreeComplete}
                  finalSaveResult={finalSaveResult}
                />
              )}
            </StepperContent>
          </Stepper>
        </CardContent>
      </Card>
    </div>
  );
}
