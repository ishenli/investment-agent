import type { JobType } from '@/types/scheduledJob';

export type JobTemplateTranslationKey =
  | 'templates.insight.name'
  | 'templates.insight.description'
  | 'templates.insight.instructions'
  | 'templates.reportWeekly.name'
  | 'templates.reportWeekly.description'
  | 'templates.reportWeekly.instructions'
  | 'templates.reportMonthly.name'
  | 'templates.reportMonthly.description'
  | 'templates.reportMonthly.instructions'
  | 'templates.agent.name'
  | 'templates.agent.description'
  | 'templates.agent.instructions';

export interface JobTemplate {
  nameKey: JobTemplateTranslationKey;
  descriptionKey: JobTemplateTranslationKey;
  instructionKey: JobTemplateTranslationKey;
  jobType: JobType;
  cronExpression: string;
  requiresAccount: boolean;
}

export const JOB_TEMPLATES: JobTemplate[] = [
  {
    nameKey: 'templates.insight.name',
    descriptionKey: 'templates.insight.description',
    instructionKey: 'templates.insight.instructions',
    jobType: 'insight',
    cronExpression: '0 8 * * *',
    requiresAccount: true,
  },
  {
    nameKey: 'templates.reportWeekly.name',
    descriptionKey: 'templates.reportWeekly.description',
    instructionKey: 'templates.reportWeekly.instructions',
    jobType: 'report_weekly',
    cronExpression: '0 9 * * 1',
    requiresAccount: true,
  },
  {
    nameKey: 'templates.reportMonthly.name',
    descriptionKey: 'templates.reportMonthly.description',
    instructionKey: 'templates.reportMonthly.instructions',
    jobType: 'report_monthly',
    cronExpression: '0 9 1 * *',
    requiresAccount: true,
  },
  {
    nameKey: 'templates.agent.name',
    descriptionKey: 'templates.agent.description',
    instructionKey: 'templates.agent.instructions',
    jobType: 'agent',
    cronExpression: '0 9 * * *',
    requiresAccount: false,
  },
];
