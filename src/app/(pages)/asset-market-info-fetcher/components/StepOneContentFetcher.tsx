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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('asset-market-info-fetcher');
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
        setCrawlError(result.error || t('error.crawlFailed'));
      }
    } catch (error) {
      setCrawlError(error instanceof Error ? error.message : t('error.unknown'));
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
        setSaveManualError(result.error || t('error.saveFailed'));
      }
    } catch (error) {
      setSaveManualError(error instanceof Error ? error.message : t('error.unknown'));
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
                <h3 className="font-medium">{t('steps.step1.urlMode.title')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t('steps.step1.urlMode.description')}</p>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer transition-all hover:border-primary hover:bg-primary/5"
              onClick={() => setInputMode('manual')}
            >
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <IconPencil className="mb-2 h-8 w-8 text-primary" />
                <h3 className="font-medium">{t('steps.step1.manualMode.title')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t('steps.step1.manualMode.description')}</p>
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
                <h3 className="text-lg font-medium text-green-800 dark:text-green-200">{t('steps.step1.crawlSuccess.title')}</h3>
              </div>
              <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                <p>{t('steps.step1.crawlSuccess.titleLabel')}: {crawlResult.metadata?.extractedData?.title || t('error.unknown')}</p>
                <p>{t('steps.step1.crawlSuccess.source')}: {crawlResult.source.name}</p>
                <p>{t('steps.step1.crawlSuccess.contentLength')}: {crawlResult.content.length} {t('steps.step1.crawlSuccess.contentLength')}</p>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setInputMode(null)}>
                {t('steps.step1.actions.reselect')}
              </Button>
              <Button onClick={() => onNext(crawlResult)}>{t('steps.step2.actions.next')}</Button>
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
              <Label htmlFor="url">{t('steps.step1.form.url.label')}</Label>
              <Input
                id="url"
                type="url"
                placeholder={t('steps.step1.form.url.placeholder')}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">{t('steps.step1.form.url.description')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataSourceType">{t('steps.step1.form.dataSourceType.label')}</Label>
              <Select
                value={dataSourceType}
                onValueChange={(value: DataSourceType) => setDataSourceType(value)}
              >
                <SelectTrigger id="dataSourceType">
                  <SelectValue placeholder={t('steps.step1.form.dataSourceType.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DataSourceType.WEB}>{t('dataTypes.web')}</SelectItem>
                  <SelectItem value={DataSourceType.WECHAT_MP}>{t('dataTypes.wechatMp')}</SelectItem>
                  <SelectItem value={DataSourceType.FUTU_NEWS}>{t('dataTypes.futuNews')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setInputMode(null)}>
                {t('steps.step1.actions.back')}
              </Button>
              <Button type="submit" disabled={isCrawling}>
                {isCrawling ? (
                  <>
                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('steps.step1.actions.crawling')}
                  </>
                ) : (
                  t('steps.step1.actions.crawl')
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
              <h3 className="text-lg font-medium text-green-800 dark:text-green-200">{t('steps.step1.form.saveSuccess.title')}</h3>
            </div>
            <div className="mt-2 text-sm text-green-700 dark:text-green-300">
              <p>{t('steps.step1.form.saveSuccess.titleLabel')}: {saveManualResult.metadata?.extractedData?.title || t('error.unknown')}</p>
              <p>{t('steps.step1.form.saveSuccess.format')}: {saveManualResult.format}</p>
              <p>{t('steps.step1.form.saveSuccess.contentLength')}: {saveManualResult.content.length} {t('steps.step1.form.saveSuccess.contentLength')}</p>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setInputMode(null)}>
              {t('steps.step1.actions.reselect')}
            </Button>
            <Button onClick={() => onNext(saveManualResult)}>{t('steps.step2.actions.next')}</Button>
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
            <Label htmlFor="content">{t('steps.step1.form.content.label')}</Label>
            <Textarea
              id="content"
              placeholder={t('steps.step1.form.content.placeholder')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={8}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="format">{t('steps.step1.form.format.label')}</Label>
            <Select value={format} onValueChange={(value: ContentFormat) => setFormat(value)}>
              <SelectTrigger id="format">
                <SelectValue placeholder={t('steps.step1.form.format.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ContentFormat.TEXT}>{t('dataTypes.text')}</SelectItem>
                <SelectItem value={ContentFormat.MARKDOWN}>{t('dataTypes.markdown')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setInputMode(null)}>
              {t('steps.step1.actions.back')}
            </Button>
            <Button type="submit" disabled={isSavingManual}>
              {isSavingManual ? (
                <>
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('steps.step1.actions.saving')}
                </>
              ) : (
                t('steps.step1.actions.save')
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
