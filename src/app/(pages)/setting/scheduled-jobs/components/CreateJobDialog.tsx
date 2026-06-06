'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
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
import { JOB_TEMPLATES, type JobTemplate } from '../constants';
import type { TradingAccountType } from '@typings/account';
import type { JobType } from '@/types/scheduledJob';

type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';
type NotificationChannel = 'app';

interface CreateJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: JobTemplate | null;
  accounts: TradingAccountType[];
  currentAccountId: string | undefined;
  onConfirm: (data: {
    name: string;
    cronExpression: string;
    jobType: string;
    accountId?: number;
    config?: Record<string, unknown>;
  }) => void;
  loading?: boolean;
}

function getTimeFromCron(cronExpression: string): string {
  const [minute = '0', hour = '9'] = cronExpression.split(' ');
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

function getFrequencyFromCron(cronExpression: string): ScheduleFrequency {
  const [, , dayOfMonth, , dayOfWeek] = cronExpression.split(' ');
  if (dayOfMonth && dayOfMonth !== '*') return 'monthly';
  if (dayOfWeek && dayOfWeek !== '*') return 'weekly';
  return 'daily';
}

function buildCronExpression(frequency: ScheduleFrequency, time: string): string {
  const [hour = '9', minute = '0'] = time.split(':');
  const normalizedHour = String(parseInt(hour, 10) || 0);
  const normalizedMinute = String(parseInt(minute, 10) || 0);

  switch (frequency) {
    case 'weekly':
      return `${normalizedMinute} ${normalizedHour} * * 1`;
    case 'monthly':
      return `${normalizedMinute} ${normalizedHour} 1 * *`;
    case 'daily':
    default:
      return `${normalizedMinute} ${normalizedHour} * * *`;
  }
}

export function CreateJobDialog({
  open,
  onOpenChange,
  template,
  accounts,
  currentAccountId,
  onConfirm,
  loading,
}: CreateJobDialogProps) {
  const { t } = useTranslation('scheduled-job');
  const initialTemplate = template ?? JOB_TEMPLATES[0];
  const [name, setName] = useState<string>(() => t(initialTemplate.nameKey));
  const [selectedJobType, setSelectedJobType] = useState<JobType>(initialTemplate.jobType);
  const [notificationChannel, setNotificationChannel] = useState<NotificationChannel>('app');
  const [frequency, setFrequency] = useState<ScheduleFrequency>(() =>
    getFrequencyFromCron(initialTemplate.cronExpression),
  );
  const [time, setTime] = useState(() => getTimeFromCron(initialTemplate.cronExpression));
  const [accountId, setAccountId] = useState<string>(
    () => currentAccountId || (accounts[0]?.id ?? ''),
  );
  const [instructions, setInstructions] = useState<string>(() => t(initialTemplate.instructionKey));

  const activeTemplate =
    JOB_TEMPLATES.find((item) => item.jobType === selectedJobType) ?? template ?? JOB_TEMPLATES[0];

  const isAgentType = selectedJobType === 'agent';

  const handleConfirm = () => {
    if (!name.trim()) return;
    if (isAgentType && !instructions.trim()) return;
    onConfirm({
      name: name.trim(),
      cronExpression: buildCronExpression(frequency, time),
      jobType: activeTemplate.jobType,
      accountId: accountId ? parseInt(accountId) : undefined,
      config: {
        notificationChannel,
        instructions: instructions.trim(),
        ...(isAgentType && { prompt: instructions.trim() }),
        template: activeTemplate.jobType,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>{t('form.createTitle')}</DialogTitle>
          <DialogDescription>{t('form.createDescription')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>{t('form.template')}</Label>
              <Select
                value={selectedJobType}
                onValueChange={(value) => {
                  const nextTemplate = JOB_TEMPLATES.find((item) => item.jobType === value);
                  if (!nextTemplate) return;
                  setSelectedJobType(nextTemplate.jobType);
                  setName(t(nextTemplate.nameKey));
                  setFrequency(getFrequencyFromCron(nextTemplate.cronExpression));
                  setTime(getTimeFromCron(nextTemplate.cronExpression));
                  setInstructions(t(nextTemplate.instructionKey));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TEMPLATES.map((item) => (
                    <SelectItem key={item.jobType} value={item.jobType}>
                      {t(item.nameKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>{t('form.notificationChannel')}</Label>
              <Select
                value={notificationChannel}
                onValueChange={(value) => setNotificationChannel(value as NotificationChannel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="app">{t('form.notificationChannels.app')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="job-name">{t('form.name')}</Label>
            <Input
              id="job-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('form.namePlaceholder')}
            />
          </div>

          <div className="grid gap-2">
            <Label>{t('form.schedule')}</Label>
            <div className="grid gap-3 sm:grid-cols-[180px_160px]">
              <Select
                value={frequency}
                onValueChange={(value) => setFrequency(value as ScheduleFrequency)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t('form.frequency.daily')}</SelectItem>
                  <SelectItem value="weekly">{t('form.frequency.weekly')}</SelectItem>
                  <SelectItem value="monthly">{t('form.frequency.monthly')}</SelectItem>
                </SelectContent>
              </Select>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          {activeTemplate.requiresAccount && accounts.length > 0 && (
            <div className="grid gap-2">
              <Label>{t('form.account')}</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('form.selectAccount')} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.accountName || acc.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="job-instructions">
              {isAgentType ? t('form.agentPrompt') : t('form.instructions')}
              {isAgentType && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id="job-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={isAgentType ? t('form.agentPromptPlaceholder') : t('form.instructionsPlaceholder')}
              className={isAgentType ? 'min-h-[220px] resize-none' : 'min-h-[180px] resize-none'}
            />
            <p className="text-xs text-muted-foreground">
              {isAgentType ? t('form.agentPromptHint') : t('form.instructionsHint')}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('form.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={loading || !name.trim() || (isAgentType && !instructions.trim())}>
            {t('form.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
