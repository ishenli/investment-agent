'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import { Badge } from '@renderer/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@renderer/components/ui/table';
import type { ScheduledJobLog, ScheduledJobLogListResponse } from '@/types/scheduledJob';

interface JobLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: number | null;
  jobName: string;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  success: 'default',
  running: 'secondary',
  failed: 'destructive',
  pending: 'outline',
  missed: 'destructive',
};

function formatDate(date: Date | string | null): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString();
}

function formatDuration(start: Date | string, end: Date | string | null): string {
  if (!end) return '-';
  const s = typeof start === 'string' ? new Date(start) : start;
  const e = typeof end === 'string' ? new Date(end) : end;
  const ms = e.getTime() - s.getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function JobLogsDialog({ open, onOpenChange, jobId, jobName }: JobLogsDialogProps) {
  const { t } = useTranslation('scheduled-job');
  const [logs, setLogs] = useState<ScheduledJobLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/scheduled-jobs/${jobId}/logs?limit=20`);
      const result = await res.json();
      if (result.success) {
        const data = result.data as ScheduledJobLogListResponse;
        setLogs(data.items);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (open && jobId) {
      fetchLogs();
    } else {
      setLogs([]);
    }
  }, [open, jobId, fetchLogs]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('logs.title')} - {jobName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('logs.noLogs')}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('logs.status')}</TableHead>
                <TableHead>{t('logs.startedAt')}</TableHead>
                <TableHead>{t('logs.duration')}</TableHead>
                <TableHead>{t('logs.message')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[log.status] ?? 'outline'}>
                      {t(`logs.statusLabels.${log.status}` as any)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(log.startedAt)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDuration(log.startedAt, log.completedAt)}
                  </TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">
                    {log.errorMessage || (log.result as any)?.message || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
