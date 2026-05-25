'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { TaskCard } from './TaskCard';
import type { Task, TaskStatus, TasksByStatusResponse } from '@/types/task';
import { VALID_STATUS_TRANSITIONS } from '@/types/task';

type BoardColumnStatus = keyof TasksByStatusResponse;
const BOARD_COLUMNS: BoardColumnStatus[] = ['pending', 'in_progress', 'completed', 'cancelled'];

function isAllowedTransition(from: TaskStatus, to: string): boolean {
  return (VALID_STATUS_TRANSITIONS[from] as readonly string[]).includes(to);
}

interface TaskBoardProps {
  grouped: TasksByStatusResponse;
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>;
}

function DraggableTaskCard({
  task,
  onTaskClick,
}: {
  task: Task;
  onTaskClick: (task: Task) => void;
}) {
  const canDrag = VALID_STATUS_TRANSITIONS[task.status].length > 0;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: !canDrag,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className={canDrag ? 'cursor-grab active:cursor-grabbing' : ''}
    >
      <TaskCard task={task} onClick={onTaskClick} />
    </div>
  );
}

function DroppableColumn({
  status,
  tasks,
  activeTask,
  onTaskClick,
  children,
}: {
  status: BoardColumnStatus;
  tasks: Task[];
  activeTask: Task | null;
  onTaskClick: (task: Task) => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation('task');
  const { isOver, setNodeRef } = useDroppable({ id: status });

  const isValidTarget =
    activeTask !== null &&
    activeTask.status !== status &&
    isAllowedTransition(activeTask.status, status);

  const isInvalidHover = isOver && activeTask !== null && !isValidTarget;

  let borderClass = 'border-transparent';
  if (isOver && isValidTarget) {
    borderClass = 'border-green-500 bg-green-50/50 dark:bg-green-900/10';
  } else if (isInvalidHover) {
    borderClass = 'border-red-400 bg-red-50/30 dark:bg-red-900/10';
  } else if (activeTask !== null && isValidTarget) {
    borderClass = 'border-dashed border-green-300 dark:border-green-700';
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t(`status.${status}`)}
        </h3>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 min-h-[200px] rounded-lg p-2 border-2 transition-colors ${borderClass} ${
          !isOver || isValidTarget ? 'bg-muted/30' : ''
        }`}
      >
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            {t('board.emptyColumn')}
          </p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export function TaskBoard({ grouped, onTaskClick, onStatusChange }: TaskBoardProps) {
  const { t } = useTranslation('task');
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const task = event.active.data.current?.task as Task;
    setActiveTask(task);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const task = active.data.current?.task as Task;
    const targetStatus = over.id as BoardColumnStatus;

    if (task.status === targetStatus) return;
    if (!isAllowedTransition(task.status, targetStatus)) return;

    onStatusChange(task.id, targetStatus);
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {BOARD_COLUMNS.map((status) => {
          const tasks = grouped[status] ?? [];
          return (
            <DroppableColumn
              key={status}
              status={status}
              tasks={tasks}
              activeTask={activeTask}
              onTaskClick={onTaskClick}
            >
              {tasks.map((task) => (
                <DraggableTaskCard key={task.id} task={task} onTaskClick={onTaskClick} />
              ))}
            </DroppableColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rotate-2 scale-105">
            <TaskCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
