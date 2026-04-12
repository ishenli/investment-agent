'use client';

import { useState, useEffect } from 'react';
import { useReport, useDeleteReport, STAGE_DISPLAY_NAMES } from '@/app/hooks/useReport';
import { Button } from '@renderer/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert';
import { Markdown } from '@lobehub/ui';
import {
  AlertCircle,
  ArrowLeft,
  Trash2,
  Calendar,
  Clock,
  PencilIcon,
  RefreshCw,
  AlertTriangle,
  Info,
  Database,
} from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@renderer/components/ui/alert-dialog';
import { EditReportDrawer } from './components/EditReportDrawer';
import { Progress } from '@renderer/components/ui/progress';
import { useTranslation } from 'react-i18next';

interface ReportDetailProps {
  id: string;
}

/**
 * Displays the detailed view for a single report with progress tracking,
 * data source information, and edit/delete actions.
 */
export function ReportDetail({ id }: ReportDetailProps) {
  const { t } = useTranslation('report');
  const router = useRouter();
  const { data: report, isLoading, error, refetch } = useReport(id);
  const deleteMutation = useDeleteReport();

  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleDelete = () => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success(t('editDrawer.updateSuccess'));
          router.push('/report');
        },
        onError: (err) => {
          toast.error(`${t('editDrawer.updateFailed')}: ${err instanceof Error ? err.message : t('detail.unknownError')}`);
        },
      },
    );
  };

  const handleReportUpdate = () => {
    refetch();
  };

  // Parse data source summary if available
  const dataSourceInfo = report?.dataSourceSummary
    ? (() => {
        try {
          return JSON.parse(report.dataSourceSummary);
        } catch {
          return null;
        }
      })()
    : null;

  // Check if report is still generating
  const isGenerating =
    report?.generationStage !== '已完成' &&
    report?.generationStage !== '生成失败' &&
    (report?.generationProgress !== undefined && report.generationProgress < 100);

  // Get stage display name
  const getStageDisplayName = (stage: string | null) => {
    if (!stage) return t('list.status.processing');
    return STAGE_DISPLAY_NAMES[stage] || stage;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild className="pl-0">
          <Link href="/report">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('detailPage.backToList')}
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('detailPage.loadError')}</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : t('detailPage.notFound')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Navigation and Actions */}
      <div className="flex justify-between items-center">
        <Button variant="ghost" asChild className="pl-0">
          <Link href="/report">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('detailPage.backToList')}
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                {t('detailPage.deleteReport')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('detailPage.confirmDelete')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('detailPage.deleteDescription')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('detailPage.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-white"
                >
                  {t('detailPage.confirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
            <PencilIcon className="mr-2 h-4 w-4" />
            {t('detailPage.editReport')}
          </Button>
        </div>
      </div>

      {/* Manual Edit Warning */}
      {report.isManuallyEdited && (
        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">{t('detailPage.manuallyEdited')}</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            {t('detailPage.dataOutdated')}
            {report.lastEditedAt && (
              <span className="ml-1">
                {t('detailPage.lastEditedAt')} {format(new Date(report.lastEditedAt), 'yyyy-MM-dd HH:mm')}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Generation Progress */}
      {isGenerating && (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
              <CardTitle className="text-lg text-blue-800 dark:text-blue-200">
                {t('detailPage.generating')}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700 dark:text-blue-300">
                {getStageDisplayName(report.generationStage)}
              </span>
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                {report.generationProgress}%
              </span>
            </div>
            <Progress value={report.generationProgress} className="h-2" />
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {t('detailPage.generatingNote')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Report Card */}
      <Card>
        <CardHeader className="border-b space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <Badge variant="outline" className="mb-2">
                {report.type === 'weekly' ? t('detailPage.weeklyReport') : report.type === 'monthly' ? t('detailPage.monthlyReport') : t('detailPage.report')}
              </Badge>
              <CardTitle className="text-2xl">{report.title}</CardTitle>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {report.startDate && report.endDate && (
              <div className="flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                <span>
                  {format(new Date(report.startDate), 'yyyy-MM-dd')} {t('detailPage.to')}{' '}
                  {format(new Date(report.endDate), 'yyyy-MM-dd')}
                </span>
              </div>
            )}
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              <span>{t('detailPage.generatedAt')} {format(new Date(report.createdAt), 'yyyy-MM-dd HH:mm')}</span>
            </div>
            {report.updatedAt && report.updatedAt !== report.createdAt && (
              <div className="flex items-center">
                <RefreshCw className="mr-2 h-4 w-4" />
                <span>{t('detailPage.updatedAt')} {format(new Date(report.updatedAt), 'yyyy-MM-dd HH:mm')}</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Markdown>{report.content}</Markdown>
        </CardContent>
      </Card>

      {/* Data Source Summary */}
      {dataSourceInfo && !isGenerating && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">{t('detailPage.dataSource')}</CardTitle>
              {dataSourceInfo.freshnessScore !== undefined && (
                <Badge
                  variant={
                    dataSourceInfo.freshnessScore >= 0.7
                      ? 'default'
                      : dataSourceInfo.freshnessScore >= 0.4
                        ? 'secondary'
                        : 'destructive'
                  }
                  className="ml-auto"
                >
                  {t('detailPage.dataFreshness')}: {Math.round(dataSourceInfo.freshnessScore * 100)}%
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dataSourceInfo.sources?.map((source: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b last:border-0 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">{source.type}</span>
                    <span className="text-muted-foreground text-xs">({source.source})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {source.lastUpdate && (
                      <span className="text-muted-foreground text-xs">
                        {format(new Date(source.lastUpdate), 'MM-dd HH:mm')}
                      </span>
                    )}
                    {source.isStale ? (
                      <Badge variant="destructive" className="text-xs">
                        {t('detailPage.stale')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
                        {t('detailPage.fresh')}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {dataSourceInfo.freshnessScore < 0.5 && (
              <Alert className="mt-4 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
                  {t('detailPage.lowFreshnessWarning')}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <EditReportDrawer
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        reportId={id}
        initialContent={report.content}
        onUpdate={handleReportUpdate}
      />
    </div>
  );
}