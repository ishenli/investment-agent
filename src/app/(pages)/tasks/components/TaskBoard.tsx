'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
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

type BoardColumnStatus = keyof TasksByStatusResponse;
const BOARD_COLUMNS: BoardColumnStatus[] = ['pending', 'in_progress', 'completed', 'cancelled'];

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
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
  }, []);

  useEffect(() => {
    if (isDragging) clearLongPress();
  }, [isDragging, clearLongPress]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      longPressTimer.current = setTimeout(() => {
        setIsLongPressing(true);
      }, 200);
      (listeners?.onPointerDown as any)?.(e);
    },
    [listeners],
  );

  const mergedListeners = { ...listeners, onPointerDown: handlePointerDown };

  const cursorClass = isDragging
    ? 'cursor-grabbing'
    : isLongPressing
      ? 'cursor-grab'
      : 'cursor-pointer';

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...mergedListeners}
      onPointerUp={clearLongPress}
      onPointerLeave={clearLongPress}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className={`relative ${cursorClass}`}
    >
      <TaskCard task={task} onClick={onTaskClick} />
    </div>
  );
}

const columnColorMap: Record<BoardColumnStatus, { header: string; indicator: string }> = {
  pending: { header: 'text-amber-600 dark:text-amber-400', indicator: 'bg-amber-500' },
  in_progress: { header: 'text-blue-600 dark:text-blue-400', indicator: 'bg-blue-500' },
  completed: { header: 'text-green-600 dark:text-green-400', indicator: 'bg-green-500' },
  cancelled: { header: 'text-red-600 dark:text-red-400', indicator: 'bg-red-500' },
};

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
    activeTask.status !== status;

  let borderClass = 'border-transparent';
  if (isOver && isValidTarget) {
    borderClass = 'border-green-500 bg-green-50/50 dark:bg-green-900/10';
  } else if (activeTask !== null && isValidTarget) {
    borderClass = 'border-dashed border-green-300 dark:border-green-700';
  }

  const colors = columnColorMap[status];

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${colors.indicator}`} />
          <h3 className={`text-sm font-semibold uppercase tracking-wide ${colors.header}`}>
            {t(`status.${status}`)}
          </h3>
        </div>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 min-h-[200px] rounded-lg p-2 border-2 transition-colors ${borderClass} bg-muted/30`}
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
    useSensor(PointerSensor, { activationConstraint: { delay: 300, tolerance: 5 } })
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
