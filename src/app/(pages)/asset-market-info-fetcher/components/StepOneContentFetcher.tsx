'use client';

import { useState } from 'react';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { Textarea } from '@renderer/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import {
  IconWorld,
  IconFileText,
  IconCheck,
  IconLoader2,
  IconLink,
  IconPencil,
} from '@tabler/icons-react';
import { Card, CardContent } from '@renderer/components/ui/card';
import { MarketInformation, ContentFormat, DataSourceType } from '@typings/market';

interface StepOneContentFetcherProps {
  inputMode: 'url' | 'manual' | null;
  setInputMode: (mode: 'url' | 'manual' | null) => void;
  onNext: (result: MarketInformation) => void;
}

export function StepOneContentFetcher({
  inputMode,
  setInputMode,
  onNext,
}: StepOneContentFetcherProps) {
  // URL抓取状态
  const [url, setUrl] = useState('');
  const [dataSourceType, setDataSourceType] = useState<DataSourceType>(DataSourceType.WEB);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState<MarketInformation | null>(null);
  const [crawlError, setCrawlError] = useState<string | null>(null);

  // 手动输入状态
  const [content, setContent] = useState('');
  const [format, setFormat] = useState<ContentFormat>(ContentFormat.TEXT);
  const [tags, setTags] = useState('');
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [saveManualResult, setSaveManualResult] = useState<MarketInformation | null>(null);
  const [saveManualError, setSaveManualError] = useState<string | null>(null);

  // 处理URL抓取
  const handleCrawl = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCrawling(true);
    setCrawlError(null);

    try {
      const response = await fetch('/api/market-fetcher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          dataSourceType,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setCrawlResult(result.data.data);
        onNext(result.data.data);
      } else {
        setCrawlError(result.error || '抓取失败');
      }
    } catch (error) {
      setCrawlError(error instanceof Error ? error.message : '未知错误');
    } finally {
      setIsCrawling(false);
    }
  };

  // 处理手动输入保存
  const handleSaveManualInput = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingManual(true);
    setSaveManualError(null);

    try {
      const response = await fetch('/api/market-fetcher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          format,
          tags: tags ? tags.split(',').map((tag) => tag.trim()) : [],
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSaveManualResult(result.data.data);
        onNext(result.data.data);
      } else {
        setSaveManualError(result.error || '保存失败');
      }
    } catch (error) {
      setSaveManualError(error instanceof Error ? error.message : '未知错误');
    } finally {
      setIsSavingManual(false);
    }
  };

  return (
    <div className="space-y-4">
      {inputMode === null ? (
        // 选择输入方式
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card
              className="cursor-pointer transition-all hover:border-primary hover:bg-primary/5"
              onClick={() => setInputMode('url')}
            >
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <IconLink className="mb-2 h-8 w-8 text-primary" />
                <h3 className="font-medium">通过URL抓取</h3>
                <p className="mt-1 text-sm text-muted-foreground">输入网页地址自动抓取内容</p>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer transition-all hover:border-primary hover:bg-primary/5"
              onClick={() => setInputMode('manual')}
            >
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <IconPencil className="mb-2 h-8 w-8 text-primary" />
                <h3 className="font-medium">手动录入</h3>
                <p className="mt-1 text-sm text-muted-foreground">手动输入市场信息内容</p>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : inputMode === 'url' ? (
        // URL抓取表单
        crawlResult ? (
          <div className="space-y-4">
            <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/20">
              <div className="flex items-center gap-2">
                <IconCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h3 className="text-lg font-medium text-green-800 dark:text-green-200">抓取成功</h3>
              </div>
              <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                <p>标题: {crawlResult.metadata?.extractedData?.title || '未提取到标题'}</p>
                <p>来源: {crawlResult.source.name}</p>
                <p>内容长度: {crawlResult.content.length} 字符</p>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setInputMode(null)}>
                重新选择
              </Button>
              <Button onClick={() => onNext(crawlResult)}>下一步: AI分析</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCrawl} className="space-y-4">
            {crawlError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive dark:bg-destructive/20">
                {crawlError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="url">网页URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/market-news"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">输入要抓取的网页地址</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataSourceType">数据源类型</Label>
              <Select
                value={dataSourceType}
                onValueChange={(value: DataSourceType) => setDataSourceType(value)}
              >
                <SelectTrigger id="dataSourceType">
                  <SelectValue placeholder="选择数据源类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DataSourceType.WEB}>普通网页</SelectItem>
                  <SelectItem value={DataSourceType.WECHAT_MP}>微信公众号</SelectItem>
                  <SelectItem value={DataSourceType.FUTU_NEWS}>富途新闻</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setInputMode(null)}>
                返回
              </Button>
              <Button type="submit" disabled={isCrawling}>
                {isCrawling ? (
                  <>
                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                    抓取中...
                  </>
                ) : (
                  '开始抓取'
                )}
              </Button>
            </div>
          </form>
        )
      ) : // 手动输入表单
      saveManualResult ? (
        <div className="space-y-4">
          <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/20">
            <div className="flex items-center gap-2">
              <IconCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h3 className="text-lg font-medium text-green-800 dark:text-green-200">录入成功</h3>
            </div>
            <div className="mt-2 text-sm text-green-700 dark:text-green-300">
              <p>标题: {saveManualResult.metadata?.extractedData?.title || '未提取到标题'}</p>
              <p>格式: {saveManualResult.format}</p>
              <p>内容长度: {saveManualResult.content.length} 字符</p>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setInputMode(null)}>
              重新选择
            </Button>
            <Button onClick={() => onNext(saveManualResult)}>下一步: AI分析</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSaveManualInput} className="space-y-4">
          {saveManualError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive dark:bg-destructive/20">
              {saveManualError}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="content">内容</Label>
            <Textarea
              id="content"
              placeholder="输入市场信息内容..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={8}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="format">内容格式</Label>
            <Select value={format} onValueChange={(value: ContentFormat) => setFormat(value)}>
              <SelectTrigger id="format">
                <SelectValue placeholder="选择内容格式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ContentFormat.TEXT}>纯文本</SelectItem>
                <SelectItem value={ContentFormat.MARKDOWN}>Markdown</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setInputMode(null)}>
              返回
            </Button>
            <Button type="submit" disabled={isSavingManual}>
              {isSavingManual ? (
                <>
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存信息'
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
