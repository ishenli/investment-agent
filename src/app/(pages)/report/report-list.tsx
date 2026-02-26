'use client';

import { useState, useEffect } from 'react';
import { useReports, useGenerateReport, ReportType } from '@/app/hooks/useReport';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import { Button } from '@renderer/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert';
import { AlertCircle, Plus, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { get } from '@/app/lib/request';
import { ProviderModel } from '@/types/modelProvider';

export function ReportList() {
  const { t } = useTranslation('report');
  const router = useRouter();
  const [reportType, setReportType] = useState<ReportType>('weekly');
  const { data, isLoading, error } = useReports(undefined, 20, 0);
  const generateMutation = useGenerateReport();

  // 模型选择相关状态
  const [availableModels, setAvailableModels] = useState<ProviderModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [selectedModelSlug, setSelectedModelSlug] = useState<string | null>(null);

  // 获取可用模型列表
  useEffect(() => {
    const fetchAvailableModels = async () => {
      try {
        setModelsLoading(true);
        const response = await get('/api/model-providers/models/available');
        if (response.success && response.data?.models) {
          const models = response.data.models as ProviderModel[];
          setAvailableModels(models);
          // 默认选中用户的默认模型，如果没有则选中第一个
          const defaultModel = response.data.defaultModel;
          if (defaultModel) {
            setSelectedModelSlug(defaultModel);
          } else if (models.length > 0) {
            setSelectedModelSlug(models[0].slug);
          }
        }
      } catch (error) {
        console.error('Failed to fetch available models:', error);
      } finally {
        setModelsLoading(false);
      }
    };

    fetchAvailableModels();
  }, []);

  const handleGenerate = () => {
    generateMutation.mutate(
      { type: reportType, modelSlug: selectedModelSlug || undefined },
      {
        onSuccess: (data) => {
          toast.success(t('detail.generateSuccess'));
          // 立即跳转到详情页
          router.push(`/report/${data.id}`);
        },
        onError: (err) => {
          const errorMessage = err instanceof Error ? err.message : t('detail.unknownError');
          toast.error(`${t('detail.generateFailed')}: ${errorMessage}`);
        },
      },
    );
  };

  const getStatusColor = (status: string) => {
    // There is no status in list item yet, but we might add it later.
    // Assuming status logic based on API response structure if it exists.
    // Currently list item has: id, title, type, startDate, endDate, createdAt.
    // If we want status, we might need to update the API list type.
    // For now, assume generated reports are valid.
    return 'bg-green-100 text-green-800';
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'weekly':
        return t('list.type.weekly');
      case 'monthly':
        return t('list.type.monthly');
      case 'emergency':
        return t('list.type.emergency');
      default:
        return t('title');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('error', { ns: 'common' })}</AlertTitle>
        <AlertDescription>
          {t('messages.loadError', { error: error instanceof Error ? error.message : t('detail.unknownError') })}
        </AlertDescription>
      </Alert>
    );
  }

  const reports = data?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">{t('list.title')}</h2>

        <div className="flex items-center gap-2">
          {/* 模型选择器 */}
          <Select
            value={selectedModelSlug || undefined}
            onValueChange={setSelectedModelSlug}
            disabled={modelsLoading || availableModels.length === 0}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('list.modelSelector.placeholder')} />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((model) => (
                <SelectItem key={model.id} value={model.slug}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder={t('list.type.placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">{t('list.type.weekly')}</SelectItem>
              <SelectItem value="monthly">{t('list.type.monthly')}</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleGenerate} disabled={generateMutation.isPending || !selectedModelSlug}>
            {generateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {t('list.generateButton')}
          </Button>
        </div>
      </div>

      {reports.length === 0 ? (
        <Alert>
          <AlertTitle>{t('list.empty')}</AlertTitle>
          <AlertDescription>{t('list.emptyDescription')}</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {reports.map((report) => (
            <Link key={report.id} href={`/report/${report.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="mb-2">
                      {getTypeLabel(report.type)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(report.createdAt), 'MM-dd HH:mm')}
                    </span>
                  </div>
                  <CardTitle className="text-lg leading-tight">{report.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground mt-2">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>
                      {report.startDate && report.endDate ? (
                        <>
                          {format(new Date(report.startDate), 'MM.dd')} -{' '}
                          {format(new Date(report.endDate), 'MM.dd')}
                        </>
                      ) : (
                        t('messages.noDateRange')
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}