'use client';

import { useState } from 'react';
import { useReports, useGenerateReport, ReportType } from '@/app/hooks/useReport';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
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
} from "@renderer/components/ui/select";
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function ReportList() {
  const router = useRouter();
  const [reportType, setReportType] = useState<ReportType>('weekly');
  const { data, isLoading, error } = useReports(undefined, 20, 0);
  const generateMutation = useGenerateReport();

  const handleGenerate = () => {
    generateMutation.mutate(
      { type: reportType },
      {
        onSuccess: (data) => {
          toast.success('报告生成任务已提交');
          // 立即跳转到详情页
          router.push(`/report/${data.id}`);
        },
        onError: (err) => {
          toast.error(`生成失败: ${err instanceof Error ? err.message : '未知错误'}`);
        },
      }
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
      case 'weekly': return '周报';
      case 'monthly': return '月报';
      case 'emergency': return '紧急报告';
      default: return '报告';
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
        <AlertTitle>错误</AlertTitle>
        <AlertDescription>
          无法加载报告列表: {error instanceof Error ? error.message : '未知错误'}
        </AlertDescription>
      </Alert>
    );
  }

  const reports = data?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">报告列表</h2>

        <div className="flex items-center gap-2">
          <Select
            value={reportType}
            onValueChange={(v) => setReportType(v as ReportType)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">周报</SelectItem>
              <SelectItem value="monthly">月报</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
            {generateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            生成报告
          </Button>
        </div>
      </div>

      {reports.length === 0 ? (
        <Alert>
          <AlertTitle>暂无报告</AlertTitle>
          <AlertDescription>您还没有生成过任何投资报告。点击上方按钮开始生成。</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                          {format(new Date(report.startDate), 'MM.dd')} - {format(new Date(report.endDate), 'MM.dd')}
                        </>
                      ) : '无时间范围'}
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
