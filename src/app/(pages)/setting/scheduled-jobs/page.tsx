'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs';
import { Button } from '@renderer/components/ui/button';
import { notificationManager } from '@/app/lib/notification';
import { useAccountStore } from '@renderer/store/account/store';
import { IconPlus } from '@tabler/icons-react';
import { ScheduledJobList } from './components/ScheduledJobList';
import { JobTemplateCards } from './components/JobTemplateCards';
import { CreateJobDialog } from './components/CreateJobDialog';
import { JobLogsDialog } from './components/JobLogsDialog';
import type { ScheduledJobWithNextRun, ScheduledJobListResponse } from '@/types/scheduledJob';
import { JOB_TEMPLATES, type JobTemplate } from './constants';

export default function ScheduledJobsPage() {
  const { t } = useTranslation('scheduled-job');
  const searchParams = useSearchParams();
  const didOpenTemplateFromQuery = useRef(false);

  const account = useAccountStore((state) => state.account);
  const accounts = useAccountStore((state) => state.accounts);

  const [jobs, setJobs] = useState<ScheduledJobWithNextRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<JobTemplate | null>(null);

  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [logsJobId, setLogsJobId] = useState<number | null>(null);
  const [logsJobName, setLogsJobName] = useState('');

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    notificationManager.toast({ title: text, variant: type });
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/scheduled-jobs');
      const result = await res.json();
      if (result.success) {
        const data = result.data as ScheduledJobListResponse;
        setJobs(data.items);
      } else {
        setError(result.message ?? t('messages.fetchError'));
      }
    } catch {
      setError(t('messages.networkError'));
    }
  }, [t]);

  useEffect(() => {
    setLoading(true);
    fetchJobs().finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateFromTemplate = (template: JobTemplate) => {
    setSelectedTemplate(template);
    setCreateDialogOpen(true);
  };

  const handleCreateCustom = () => {
    setSelectedTemplate(null);
    setCreateDialogOpen(true);
  };

  useEffect(() => {
    if (didOpenTemplateFromQuery.current) return;

    const templateType = searchParams.get('template');
    const template = JOB_TEMPLATES.find((item) => item.jobType === templateType);
    if (!template) return;

    didOpenTemplateFromQuery.current = true;
    setSelectedTemplate(template);
    setCreateDialogOpen(true);
  }, [searchParams]);

  const handleConfirmCreate = async (data: {
    name: string;
    cronExpression: string;
    jobType: string;
    accountId?: number;
    config?: Record<string, unknown>;
  }) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/scheduled-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        showMessage('success', t('messages.createSuccess'));
        setCreateDialogOpen(false);
        await fetchJobs();
      } else {
        showMessage('error', result.message ?? t('messages.createError'));
      }
    } catch {
      showMessage('error', t('messages.networkError'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleEnabled = async (jobId: number, enabled: boolean) => {
    try {
      const res = await fetch(`/api/scheduled-jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: enabled }),
      });
      const result = await res.json();
      if (result.success) {
        setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, isEnabled: enabled } : j)));
      } else {
        showMessage('error', result.message ?? t('messages.updateError'));
      }
    } catch {
      showMessage('error', t('messages.networkError'));
    }
  };

  const handleExecute = async (jobId: number) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/scheduled-jobs/${jobId}/execute`, {
        method: 'POST',
      });
      const result = await res.json();
      if (result.success) {
        showMessage('success', t('messages.executeSuccess'));
        await fetchJobs();
      } else {
        showMessage('error', result.message ?? t('messages.executeError'));
      }
    } catch {
      showMessage('error', t('messages.networkError'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (jobId: number) => {
    try {
      const res = await fetch(`/api/scheduled-jobs/${jobId}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        showMessage('success', t('messages.deleteSuccess'));
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
      } else {
        showMessage('error', result.message ?? t('messages.deleteError'));
      }
    } catch {
      showMessage('error', t('messages.networkError'));
    }
  };

  const handleViewLogs = (jobId: number) => {
    const job = jobs.find((j) => j.id === jobId);
    setLogsJobId(jobId);
    setLogsJobName(job?.name ?? '');
    setLogsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        <div className="text-lg text-muted-foreground">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{t('description')}</p>
        <Button onClick={handleCreateCustom}>
          <IconPlus className="mr-2 h-4 w-4" />
          {t('actions.create')}
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 rounded">
          {error}
        </div>
      )}

      <Tabs defaultValue="jobs" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[300px]">
          <TabsTrigger value="jobs">{t('tabs.jobList')}</TabsTrigger>
          <TabsTrigger value="templates">{t('tabs.quickCreate')}</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="mt-4">
          <ScheduledJobList
            jobs={jobs}
            onToggleEnabled={handleToggleEnabled}
            onExecute={handleExecute}
            onDelete={handleDelete}
            onViewLogs={handleViewLogs}
          />
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <JobTemplateCards
            onCreateFromTemplate={handleCreateFromTemplate}
            loading={actionLoading}
          />
        </TabsContent>
      </Tabs>

      <CreateJobDialog
        key={`${selectedTemplate?.jobType ?? 'insight'}-${createDialogOpen ? 'open' : 'closed'}`}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        template={selectedTemplate}
        accounts={accounts}
        currentAccountId={account?.id}
        onConfirm={handleConfirmCreate}
        loading={actionLoading}
      />

      <JobLogsDialog
        open={logsDialogOpen}
        onOpenChange={setLogsDialogOpen}
        jobId={logsJobId}
        jobName={logsJobName}
      />
    </div>
  );
}
