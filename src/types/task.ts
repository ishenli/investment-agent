/**
 * Task Management - Shared Types
 *
 * 任务管理系统的共享类型定义，前后端通用。
 */

// ============== Enums / Unions ==============

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
export type TaskType = 'one_time' | 'price_trigger' | 'monitoring' | 'date_driven';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskSourceType = 'agent_chat' | 'analysis_report' | 'manual';
export type TriggerDirection = 'above' | 'below';

// ============== Entity ==============

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  type: TaskType;
  priority: TaskPriority;
  linkedSymbols: string[];
  triggerPrice: number | null;
  triggerDirection: TriggerDirection | null;
  triggerExecutedAt: Date | null;
  dueDate: Date | null;
  completedAt: Date | null;
  executionNotes: string | null;
  sourceType: TaskSourceType;
  sourceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============== Input Types ==============

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  type?: TaskType;
  priority?: TaskPriority;
  linkedSymbols?: string[];
  triggerPrice?: number | null;
  triggerDirection?: TriggerDirection | null;
  dueDate?: string | null; // ISO string from frontend
  sourceType?: TaskSourceType;
  sourceId?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  type?: TaskType;
  priority?: TaskPriority;
  linkedSymbols?: string[];
  triggerPrice?: number | null;
  triggerDirection?: TriggerDirection | null;
  dueDate?: string | null; // ISO string from frontend
  executionNotes?: string | null;
}

// ============== Filter / Query Types ==============

export interface TaskFilters {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  type?: TaskType;
  search?: string;
  dueDateFrom?: string; // ISO string
  dueDateTo?: string;   // ISO string
}

export interface TaskPagination {
  limit?: number;
  offset?: number;
}

export interface TaskListResponse {
  items: Task[];
  total: number;
}

export interface TasksByStatusResponse {
  pending: Task[];
  in_progress: Task[];
  completed: Task[];
  cancelled: Task[];
}

// ============== Status Transition ==============

export const VALID_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pending: ['in_progress', 'cancelled', 'expired'],
  in_progress: ['completed', 'cancelled', 'expired'],
  completed: [],
  cancelled: ['pending', 'in_progress'],
  expired: [],
};
