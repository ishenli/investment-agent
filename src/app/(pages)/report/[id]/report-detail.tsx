'use client';

import { useState } from 'react';
import { useReport, useDeleteReport } from '@/app/hooks/useReport';
import { Button } from '@renderer/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert';
import { Markdown } from '@lobehub/ui';
import { AlertCircle, ArrowLeft, Trash2, Calendar, Clock, PencilIcon } from 'lucide-react';
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

interface ReportDetailProps {
  id: string;
}

/**
 * Displays the detailed view for a single report and exposes edit and delete actions.
 *
 * Renders loading, error/not-found, and success states; in the success state it shows
 * report metadata, content rendered as Markdown, a delete action (with confirmation)
 * that removes the report and navigates back to the report list, and an edit action
 * that opens an edit drawer. When the report is edited, the component refreshes its data.
 *
 * @param id - The identifier of the report to load and display
 * @returns A React element containing the report detail view
 */
export function ReportDetail({ id }: ReportDetailProps) {
  const router = useRouter();
  const { data: report, isLoading, error, refetch } = useReport(id);
  const deleteMutation = useDeleteReport();

  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleDelete = () => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success('报告已删除');
          router.push('/report');
        },
        onError: (err) => {
          toast.error(`删除失败: ${err instanceof Error ? err.message : '未知错误'}`);
        },
      },
    );
  };

  const handleReportUpdate = () => {
    // 刷新报告数据
    refetch();
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
            返回列表
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>无法加载报告</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : '报告不存在或已被删除'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <Button variant="ghost" asChild className="pl-0">
          <Link href="/report">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回列表
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                删除报告
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认删除?</AlertDialogTitle>
                <AlertDialogDescription>
                  此操作无法撤销。这将永久删除该份分析报告。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-white"
                >
                  确认删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
            <PencilIcon className="mr-2 h-4 w-4" />
            编辑报告
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <Badge variant="outline" className="mb-2">
                {report.type === 'weekly' ? '周报' : report.type === 'monthly' ? '月报' : '报告'}
              </Badge>
              <CardTitle className="text-2xl">{report.title}</CardTitle>
            </div>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            {report.startDate && report.endDate && (
              <div className="flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                <span>
                  {format(new Date(report.startDate), 'yyyy-MM-dd')} 至{' '}
                  {format(new Date(report.endDate), 'yyyy-MM-dd')}
                </span>
              </div>
            )}
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              <span>生成于 {format(new Date(report.createdAt), 'yyyy-MM-dd HH:mm')}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Markdown>{report.content}</Markdown>
        </CardContent>
      </Card>

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