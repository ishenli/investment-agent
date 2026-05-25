'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@renderer/components/ui/dialog';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Textarea } from '@renderer/components/ui/textarea';
import { Label } from '@renderer/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import { useTranslation } from 'react-i18next';
import type {
  Task,
  TaskType,
  TaskPriority,
  TriggerDirection,
  CreateTaskInput,
  UpdateTaskInput,
} from '@/types/task';

type EditorMode = 'create' | 'view' | 'edit';

interface TaskEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: EditorMode;
  task?: Task | null;
  onSave: (data: CreateTaskInput | (UpdateTaskInput & { id: string })) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const TASK_TYPES: TaskType[] = ['one_time', 'price_trigger', 'monitoring', 'date_driven'];
const TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
const TRIGGER_DIRECTIONS: TriggerDirection[] = ['above', 'below'];

export function TaskEditor({ open, onOpenChange, mode, task, onSave, onDelete }: TaskEditorProps) {
  const { t } = useTranslation('task');

  const [currentMode, setCurrentMode] = useState<EditorMode>(mode);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TaskType>('one_time');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [linkedSymbolsStr, setLinkedSymbolsStr] = useState('');
  const [triggerPrice, setTriggerPrice] = useState('');
  const [triggerDirection, setTriggerDirection] = useState<TriggerDirection>('above');
  const [dueDate, setDueDate] = useState('');
  const [executionNotes, setExecutionNotes] = useState('');

  // Reset form when opening or task changes
  useEffect(() => {
    setCurrentMode(mode);
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setType(task.type);
      setPriority(task.priority);
      setLinkedSymbolsStr(task.linkedSymbols.join(','));
      setTriggerPrice(task.triggerPrice != null ? String(task.triggerPrice) : '');
      setTriggerDirection(task.triggerDirection ?? 'above');
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '');
      setExecutionNotes(task.executionNotes ?? '');
    } else {
      setTitle('');
      setDescription('');
      setType('one_time');
      setPriority('medium');
      setLinkedSymbolsStr('');
      setTriggerPrice('');
      setTriggerDirection('above');
      setDueDate('');
      setExecutionNotes('');
    }
  }, [task, mode, open]);

  const isReadOnly = currentMode === 'view';
  const isPriceTrigger = type === 'price_trigger';

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const linkedSymbols = linkedSymbolsStr
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);

      if (currentMode === 'create') {
        const input: CreateTaskInput = {
          title: title.trim(),
          description: description.trim() || null,
          type,
          priority,
          linkedSymbols,
          triggerPrice: isPriceTrigger && triggerPrice ? Number(triggerPrice) : null,
          triggerDirection: isPriceTrigger ? triggerDirection : null,
          dueDate: dueDate || null,
          sourceType: 'manual',
        };
        await onSave(input);
      } else if (currentMode === 'edit' && task) {
        const input: UpdateTaskInput & { id: string } = {
          id: task.id,
          title: title.trim(),
          description: description.trim() || null,
          type,
          priority,
          linkedSymbols,
          triggerPrice: isPriceTrigger && triggerPrice ? Number(triggerPrice) : null,
          triggerDirection: isPriceTrigger ? triggerDirection : null,
          dueDate: dueDate || null,
          executionNotes: executionNotes.trim() || null,
        };
        await onSave(input);
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !onDelete) return;
    if (!confirm(t('messages.deleteConfirm'))) return;
    setDeleting(true);
    try {
      await onDelete(task.id);
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  };

  const dialogTitle = {
    create: t('editor.createTitle'),
    edit: t('editor.editTitle'),
    view: t('editor.viewTitle'),
  }[currentMode];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title">{t('fields.title')} *</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('fields.titlePlaceholder')}
              disabled={isReadOnly}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="task-description">{t('fields.description')}</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('fields.descriptionPlaceholder')}
              disabled={isReadOnly}
              className="min-h-20"
            />
          </div>

          {/* Type & Priority row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('fields.type')}</Label>
              <Select value={type} onValueChange={(v) => setType(v as TaskType)} disabled={isReadOnly}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((tp) => (
                    <SelectItem key={tp} value={tp}>
                      {t(`type.${tp}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('fields.priority')}</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)} disabled={isReadOnly}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {t(`priority.${p}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Linked Symbols */}
          <div className="space-y-2">
            <Label htmlFor="task-symbols">{t('fields.linkedSymbols')}</Label>
            <Input
              id="task-symbols"
              value={linkedSymbolsStr}
              onChange={(e) => setLinkedSymbolsStr(e.target.value)}
              placeholder={t('fields.linkedSymbolsPlaceholder')}
              disabled={isReadOnly}
            />
          </div>

          {/* Trigger condition - only for price_trigger */}
          {isPriceTrigger && (
            <div className="space-y-2">
              <Label>{t('fields.triggerCondition')}</Label>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  value={triggerDirection}
                  onValueChange={(v) => setTriggerDirection(v as TriggerDirection)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_DIRECTIONS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {t(`triggerDirection.${d}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  value={triggerPrice}
                  onChange={(e) => setTriggerPrice(e.target.value)}
                  placeholder={t('fields.triggerPricePlaceholder')}
                  disabled={isReadOnly}
                />
              </div>
            </div>
          )}

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="task-due-date">{t('fields.dueDate')}</Label>
            <Input
              id="task-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isReadOnly}
            />
          </div>

          {/* Execution Notes (only in edit/view mode for existing tasks) */}
          {currentMode !== 'create' && task && (
            <div className="space-y-2">
              <Label htmlFor="task-notes">{t('fields.executionNotes')}</Label>
              <Textarea
                id="task-notes"
                value={executionNotes}
                onChange={(e) => setExecutionNotes(e.target.value)}
                placeholder={t('fields.executionNotesPlaceholder')}
                disabled={isReadOnly}
                className="min-h-16"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          {currentMode === 'view' && (
            <>
              {task && onDelete && (
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {t('actions.delete')}
                </Button>
              )}
              <Button variant="outline" onClick={() => setCurrentMode('edit')}>
                {t('actions.edit')}
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('actions.close')}
              </Button>
            </>
          )}
          {(currentMode === 'create' || currentMode === 'edit') && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('actions.cancel')}
              </Button>
              <Button onClick={handleSubmit} disabled={saving || !title.trim()}>
                {saving ? t('actions.saving') : t('actions.save')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
