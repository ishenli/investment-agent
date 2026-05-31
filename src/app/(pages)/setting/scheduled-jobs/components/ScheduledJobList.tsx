'use client';

import { useTranslation } from 'react-i18next';
import { Button } from '@renderer/components/ui/button';
import { Badge } from '@renderer/components/ui/badge';
import { Switch } from '@renderer/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@renderer/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@renderer/components/ui/dropdown-menu';
import { IconDots, IconPlayerPlay, IconHistory, IconTrash } from '@tabler/icons-react';
import type { ScheduledJobWithNextRun } from '@/types/scheduledJob';

interface ScheduledJobListProps {
  jobs: ScheduledJobWithNextRun[];
  onToggleEnabled: (jobId: number, enabled: boolean) => void;
  onExecute: (jobId: number) => void;
  onDelete: (jobId: number) => void;
  onViewLogs: (jobId: number) => void;
}

function formatDate(date: Date | string | null): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString();
}

export function ScheduledJobList({
  jobs,
  onToggleEnabled,
  onExecute,
  onDelete,
  onViewLogs,
}: ScheduledJobListProps) {
  const { t } = useTranslation('scheduled-job');

  if (jobs.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-lg font-medium text-muted-foreground">{t('table.noJobs')}</p>
        <p className="text-sm text-muted-foreground mt-2">{t('table.noJobsHint')}</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('table.name')}</TableHead>
          <TableHead>{t('table.type')}</TableHead>
          <TableHead>{t('table.cron')}</TableHead>
          <TableHead>{t('table.status')}</TableHead>
          <TableHead>{t('table.lastRun')}</TableHead>
          <TableHead>{t('table.nextRun')}</TableHead>
          <TableHead className="text-right">{t('table.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job.id}>
            <TableCell className="font-medium">{job.name}</TableCell>
            <TableCell>
              <Badge variant="outline">
                {t(`jobTypes.${job.jobType}` as any)}
              </Badge>
            </TableCell>
            <TableCell>
              <code className="text-xs">{job.cronExpression}</code>
            </TableCell>
            <TableCell>
              <Switch
                checked={job.isEnabled}
                onCheckedChange={(checked) => onToggleEnabled(job.id, checked)}
              />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDate(job.lastRunAt)}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDate(job.nextRunAt)}
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <IconDots className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onExecute(job.id)}>
                    <IconPlayerPlay className="mr-2 h-4 w-4" />
                    {t('actions.execute')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onViewLogs(job.id)}>
                    <IconHistory className="mr-2 h-4 w-4" />
                    {t('actions.viewLogs')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(job.id)}
                    className="text-destructive"
                  >
                    <IconTrash className="mr-2 h-4 w-4" />
                    {t('actions.delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
