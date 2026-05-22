'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import { Button } from '@renderer/components/ui/button';
import { Skeleton } from '@renderer/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@renderer/components/ui/table';
import { IconRefresh } from '@tabler/icons-react';
import { get } from '@/app/lib/request';

interface EvalRun {
  id: string;
  engine: string;
  categories: string;
  status: string;
  score: number;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  threshold: number;
  createdAt: string;
  completedAt?: string;
}

interface EvalHistoryListProps {
  onSelectRun: (runId: string) => void;
}

export function EvalHistoryList({ onSelectRun }: EvalHistoryListProps) {
  const { t } = useTranslation('setting');
  const [runs, setRuns] = React.useState<EvalRun[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchRuns = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await get('/api/evaluation?limit=20');
      setRuns(result.data?.runs ?? []);
    } catch (error) {
      console.error('Failed to fetch runs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">{t('evaluation.history.status.completed')}</Badge>;
      case 'running':
        return <Badge variant="secondary">{t('evaluation.history.status.running')}</Badge>;
      case 'failed':
        return <Badge variant="destructive">{t('evaluation.history.status.failed')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const parseCategories = (categoriesStr: string): string[] => {
    try {
      return JSON.parse(categoriesStr);
    } catch {
      return [categoriesStr];
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t('evaluation.history.title')}</CardTitle>
          <CardDescription>{t('evaluation.history.description')}</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRuns} disabled={loading}>
          <IconRefresh className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{t('evaluation.history.noRecords')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('evaluation.history.table.time')}</TableHead>
                <TableHead>{t('evaluation.history.table.engine')}</TableHead>
                <TableHead>{t('evaluation.history.table.category')}</TableHead>
                <TableHead>{t('evaluation.history.table.status')}</TableHead>
                <TableHead className="text-right">{t('evaluation.history.table.score')}</TableHead>
                <TableHead className="text-right">{t('evaluation.history.table.passedTotal')}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id} className="cursor-pointer" onClick={() => onSelectRun(run.id)}>
                  <TableCell className="text-xs">{formatDate(run.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{run.engine}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {parseCategories(run.categories).map((cat) => (
                        <Badge key={cat} variant="secondary" className="text-xs">
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{statusBadge(run.status)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {run.score.toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right">
                    {run.passedCases}/{run.totalCases}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      {t('evaluation.history.table.details')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
