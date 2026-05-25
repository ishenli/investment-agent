'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@renderer/components/ui/table';
import { Badge } from '@renderer/components/ui/badge';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import type { Task, TaskPriority, TaskStatus } from '@/types/task';

interface TaskListProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const statusVariantMap: Record<TaskStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  in_progress: 'default',
  completed: 'secondary',
  cancelled: 'destructive',
  expired: 'destructive',
};

const priorityColorMap: Record<TaskPriority, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function TaskList({ tasks, onTaskClick }: TaskListProps) {
  const { t } = useTranslation('task');

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t('list.empty')}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('fields.title')}</TableHead>
          <TableHead>{t('fields.status')}</TableHead>
          <TableHead>{t('fields.priority')}</TableHead>
          <TableHead>{t('fields.type')}</TableHead>
          <TableHead>{t('fields.linkedSymbols')}</TableHead>
          <TableHead>{t('fields.dueDate')}</TableHead>
          <TableHead>{t('fields.createdAt')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => {
          const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed' && task.status !== 'cancelled';
          return (
            <TableRow
              key={task.id}
              className="cursor-pointer"
              onClick={() => onTaskClick(task)}
            >
              <TableCell className="font-medium max-w-[300px] truncate">
                {task.title}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariantMap[task.status]}>
                  {t(`status.${task.status}`)}
                </Badge>
              </TableCell>
              <TableCell>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityColorMap[task.priority]}`}>
                  {t(`priority.${task.priority}`)}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {t(`type.${task.type}`)}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {task.linkedSymbols.map((symbol) => (
                    <span
                      key={symbol}
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    >
                      {symbol}
                    </span>
                  ))}
                </div>
              </TableCell>
              <TableCell className={isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}>
                {task.dueDate ? dayjs(task.dueDate).format('YYYY-MM-DD') : '-'}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {dayjs(task.createdAt).format('YYYY-MM-DD')}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
