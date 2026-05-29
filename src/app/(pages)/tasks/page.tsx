'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@renderer/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { notificationManager } from '@/app/lib/notification';
import { TaskBoard } from './components/TaskBoard';
import { TaskList } from './components/TaskList';
import { TaskEditor } from './components/TaskEditor';
import { TaskFilters } from './components/TaskFilters';
import type {
  Task,
  TaskStatus,
  TasksByStatusResponse,
  TaskListResponse,
  CreateTaskInput,
  UpdateTaskInput,
} from '@/types/task';

export default function TasksPage() {
  const { t } = useTranslation('task');

  // View state
  const [activeTab, setActiveTab] = useState<string>('board');

  // Data state
  const [boardData, setBoardData] = useState<TasksByStatusResponse>({
    pending: [],
    in_progress: [],
    completed: [],
    cancelled: [],
  });
  const [listData, setListData] = useState<Task[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Loading / error state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'view' | 'edit'>('create');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Debounce ref
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    notificationManager.toast({ title: text, variant: type });
  }, []);

  // Fetch board (grouped) data
  const fetchBoardData = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks?grouped=true');
      const result = await res.json();
      if (result.success) {
        setBoardData(result.data);
      } else {
        setError(result.message ?? t('messages.fetchError'));
      }
    } catch {
      setError(t('messages.networkError'));
    }
  }, [t]);

  // Fetch list data with filters
  const fetchListData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      params.set('limit', '50');

      const res = await fetch(`/api/tasks?${params.toString()}`);
      const result = await res.json();
      if (result.success) {
        const data = result.data as TaskListResponse;
        setListData(data.items);
        setTotalCount(data.total);
      } else {
        setError(result.message ?? t('messages.fetchError'));
      }
    } catch {
      setError(t('messages.networkError'));
    }
  }, [search, statusFilter, priorityFilter, typeFilter, t]);

  // Fetch all data (both views)
  const fetchAllData = useCallback(async () => {
    setError(null);
    await Promise.all([fetchBoardData(), fetchListData()]);
  }, [fetchBoardData, fetchListData]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    fetchAllData().finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Silent background refresh on tab switch (skip initial)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchAllData();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch list when filters change (debounced for search)
  useEffect(() => {
    if (activeTab !== 'list') return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetchListData();
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [search, statusFilter, priorityFilter, typeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handlers
  const handleCreateClick = () => {
    setSelectedTask(null);
    setEditorMode('create');
    setEditorOpen(true);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setEditorMode('view');
    setEditorOpen(true);
  };

  const handleSave = async (data: CreateTaskInput | (UpdateTaskInput & { id: string })) => {
    try {
      if ('id' in data) {
        // Update
        const { id, ...body } = data;
        const res = await fetch(`/api/tasks/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const result = await res.json();
        if (!result.success) {
          showMessage('error', result.message ?? t('messages.updateError'));
          return;
        }
        showMessage('success', t('messages.updateSuccess'));
      } else {
        // Create
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (!result.success) {
          showMessage('error', result.message ?? t('messages.createError'));
          return;
        }
        showMessage('success', t('messages.createSuccess'));
      }
      await fetchAllData();
    } catch {
      showMessage('error', t('messages.networkError'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!result.success) {
        showMessage('error', result.message ?? t('messages.deleteError'));
        return;
      }
      showMessage('success', t('messages.deleteSuccess'));
      await fetchAllData();
    } catch {
      showMessage('error', t('messages.networkError'));
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const previousBoardData = { ...boardData };

    setBoardData((prev) => {
      const next = { ...prev };
      let movedTask: Task | undefined;
      for (const status of Object.keys(next) as (keyof TasksByStatusResponse)[]) {
        const idx = next[status].findIndex((t) => t.id === taskId);
        if (idx !== -1) {
          movedTask = { ...next[status][idx], status: newStatus };
          next[status] = next[status].filter((_, i) => i !== idx);
          break;
        }
      }
      if (movedTask && newStatus in next) {
        const key = newStatus as keyof TasksByStatusResponse;
        next[key] = [movedTask, ...next[key]];
      }
      return next;
    });

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await res.json();
      if (!result.success) {
        setBoardData(previousBoardData);
        showMessage('error', result.message ?? t('messages.updateError'));
        return;
      }
      showMessage('success', t('messages.updateSuccess'));
    } catch {
      setBoardData(previousBoardData);
      showMessage('error', t('messages.networkError'));
    }
  };

  // Loading state
  if (loading && listData.length === 0 && boardData.pending.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <div className="text-lg text-muted-foreground">{t('list.loading')}</div>
      </div>
    );
  }

  const hasBoardTasks = boardData.pending.length + boardData.in_progress.length + boardData.completed.length + boardData.cancelled.length > 0;
  const hasListTasks = listData.length > 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
        </div>
        <Button onClick={handleCreateClick}>{t('actions.create')}</Button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 rounded">
          {error}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[300px]">
          <TabsTrigger value="board">{t('tabs.board')}</TabsTrigger>
          <TabsTrigger value="list">{t('tabs.list')}</TabsTrigger>
        </TabsList>

        {/* Board View */}
        <TabsContent value="board" forceMount className="mt-4 data-[state=inactive]:hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !hasBoardTasks ? (
            <div className="text-center py-16">
              <p className="text-lg font-medium text-muted-foreground">{t('empty.title')}</p>
              <p className="text-sm text-muted-foreground mt-2">{t('empty.description')}</p>
              <Button className="mt-4" onClick={handleCreateClick}>
                {t('actions.create')}
              </Button>
            </div>
          ) : (
            <TaskBoard
              grouped={boardData}
              onTaskClick={handleTaskClick}
              onStatusChange={handleStatusChange}
            />
          )}
        </TabsContent>

        {/* List View */}
        <TabsContent value="list" forceMount className="mt-4 space-y-4 data-[state=inactive]:hidden">
          <TaskFilters
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            priorityFilter={priorityFilter}
            onPriorityFilterChange={setPriorityFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
          />

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !hasListTasks ? (
            <div className="text-center py-16">
              <p className="text-lg font-medium text-muted-foreground">{t('empty.title')}</p>
              <p className="text-sm text-muted-foreground mt-2">{t('empty.description')}</p>
              <Button className="mt-4" onClick={handleCreateClick}>
                {t('actions.create')}
              </Button>
            </div>
          ) : (
            <TaskList tasks={listData} onTaskClick={handleTaskClick} />
          )}
        </TabsContent>
      </Tabs>

      {/* Editor Dialog */}
      <TaskEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        mode={editorMode}
        task={selectedTask}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
