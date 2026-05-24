'use client';

import { Input } from '@renderer/components/ui/input';
import { Button } from '@renderer/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import { useTranslation } from 'react-i18next';
import type { TaskStatus, TaskPriority, TaskType } from '@/types/task';

const ALL_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled'];
const ALL_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
const ALL_TYPES: TaskType[] = ['one_time', 'price_trigger', 'monitoring', 'date_driven'];

interface TaskFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
}

export function TaskFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  typeFilter,
  onTypeFilterChange,
}: TaskFiltersProps) {
  const { t } = useTranslation('task');

  const hasActiveFilters = statusFilter !== 'all' || priorityFilter !== 'all' || typeFilter !== 'all' || search !== '';

  const handleClearFilters = () => {
    onSearchChange('');
    onStatusFilterChange('all');
    onPriorityFilterChange('all');
    onTypeFilterChange('all');
  };

  return (
    <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
      <div className="flex-1 w-full md:w-auto">
        <Input
          placeholder={t('filters.searchPlaceholder')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder={t('filters.allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allStatuses')}</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`status.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder={t('filters.allPriorities')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allPriorities')}</SelectItem>
            {ALL_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {t(`priority.${p}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={onTypeFilterChange}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder={t('filters.allTypes')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allTypes')}</SelectItem>
            {ALL_TYPES.map((tp) => (
              <SelectItem key={tp} value={tp}>
                {t(`type.${tp}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={handleClearFilters} className="h-9">
            {t('filters.allStatuses')}
          </Button>
        )}
      </div>
    </div>
  );
}
