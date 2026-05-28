'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import type { Task, TaskPriority } from '@/types/task';

interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
}

const priorityColorMap: Record<TaskPriority, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { t } = useTranslation('task');

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed' && task.status !== 'cancelled';

  return (
    <Card
      className="hover:shadow-md transition-shadow gap-2 py-2"
      onClick={() => onClick?.(task)}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium leading-tight line-clamp-2">
          {task.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {task.description}
          </p>
        )}

        <div className="flex flex-wrap gap-1 mb-2">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityColorMap[task.priority]}`}>
            {t(`priority.${task.priority}`)}
          </span>
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            {t(`type.${task.type}`)}
          </span>
        </div>

        {task.linkedSymbols.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.linkedSymbols.map((symbol) => (
              <span
                key={symbol}
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              >
                {symbol}
              </span>
            ))}
          </div>
        )}

        {task.dueDate && (
          <div className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
            {dayjs(task.dueDate).format('YYYY-MM-DD')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
