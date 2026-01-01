'use client';

import { useReport, useDeleteReport } from '@/app/hooks/useReport';
import { Button } from '@renderer/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert';
import { Markdown } from '@lobehub/ui';
import { AlertCircle, ArrowLeft, Trash2, Calendar, Clock } from 'lucide-react';
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
} from "@renderer/components/ui/alert-dialog";

interface ReportDetailProps {
  id: string;
}

export function ReportDetail({ id }: ReportDetailProps) {
  const router = useRouter();
  const { data: report, isLoading, error } = useReport(id);
  const deleteMutation = useDeleteReport();

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
      }
    );
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
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-white">
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
                  {format(new Date(report.startDate), 'yyyy-MM-dd')} 至 {format(new Date(report.endDate), 'yyyy-MM-dd')}
                </span>
              </div>
            )}
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              <span>生成于 {format(new Date(report.createdAt), 'yyyy-MM-dd HH:mm')}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Markdown>{report.content}</Markdown>
        </CardContent>
      </Card>
    </div>
  );
}
