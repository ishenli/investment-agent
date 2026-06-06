'use client';
import { useTranslation } from 'react-i18next';
import { Button } from '@renderer/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import { IconEye, IconReport, IconCalendar, IconRobot } from '@tabler/icons-react';
import { JOB_TEMPLATES, type JobTemplate } from '../constants';
import type { JobType } from '@/types/scheduledJob';

const JOB_TYPE_ICONS: Record<JobType, typeof IconEye> = {
  insight: IconEye,
  report_weekly: IconReport,
  report_monthly: IconCalendar,
  agent: IconRobot,
};

interface JobTemplateCardsProps {
  onCreateFromTemplate: (template: JobTemplate) => void;
  loading?: boolean;
}

export function JobTemplateCards({ onCreateFromTemplate, loading }: JobTemplateCardsProps) {
  const { t } = useTranslation('scheduled-job');

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {JOB_TEMPLATES.map((template) => {
        const Icon = JOB_TYPE_ICONS[template.jobType];
        return (
          <Card key={template.jobType}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{t(template.nameKey)}</CardTitle>
              </div>
              <CardDescription>{t(template.descriptionKey)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                <span className="font-mono">{template.cronExpression}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={() => onCreateFromTemplate(template)}
                disabled={loading}
              >
                {t('templates.createFromTemplate')}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
