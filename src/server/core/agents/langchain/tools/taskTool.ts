import logger from '@server/base/logger';
import {
  createTaskBiz,
  listTasksBiz,
  updateTaskBiz,
} from '@server/core/business';
import { tool as langchainTool } from 'langchain';
import { tool as claudeTool } from '@anthropic-ai/claude-agent-sdk';
import z from 'zod';

// ============== Schemas ==============

const CreateTaskParams = z.object({
  title: z.string().describe('任务标题，必填'),
  description: z.string().optional().describe('任务描述或详细说明'),
  type: z.enum(['one_time', 'price_trigger', 'monitoring', 'date_driven']).optional().describe('任务类型，默认 one_time'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('优先级，默认 medium'),
  linked_symbols: z.array(z.string()).optional().describe('关联资产代号列表，如 ["AAPL", "NVDA"]'),
  due_date: z.string().optional().describe('截止日期（YYYY-MM-DD 格式）'),
  source_type: z.enum(['agent_chat', 'analysis_report', 'manual']).optional().describe('来源类型，默认 agent_chat'),
  source_id: z.string().optional().describe('来源ID（如聊天会话ID或报告ID）'),
});

const ListTasksParams = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'expired']).optional().describe('按状态过滤'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('按优先级过滤'),
  search: z.string().optional().describe('搜索关键词（标题或描述）'),
  limit: z.number().optional().describe('每页数量，默认20'),
  offset: z.number().optional().describe('偏移量，默认0'),
});

const UpdateTaskParams = z.object({
  task_id: z.string().describe('要更新的任务ID'),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional().describe('新状态'),
  title: z.string().optional().describe('新标题'),
  description: z.string().optional().describe('新描述'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('新优先级'),
  execution_notes: z.string().optional().describe('执行备注（完成任务时记录执行结果）'),
  linked_symbols: z.array(z.string()).optional().describe('关联资产代号列表'),
});

// ============== Core Logic ==============

async function executeCreateTask(params: {
  title: string;
  description?: string;
  type?: 'one_time' | 'price_trigger' | 'monitoring' | 'date_driven';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  linked_symbols?: string[];
  due_date?: string;
  source_type?: 'agent_chat' | 'analysis_report' | 'manual';
  source_id?: string;
}): Promise<string> {
  try {
    return await createTaskBiz(params.title, {
      description: params.description,
      type: params.type,
      priority: params.priority,
      linkedSymbols: params.linked_symbols,
      dueDate: params.due_date,
      sourceType: params.source_type,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[createTaskTool] failed:', error);
    return `任务创建失败: ${errorMsg}`;
  }
}

async function executeListTasks(params: {
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<string> {
  try {
    return await listTasksBiz({
      status: params.status,
      priority: params.priority,
      search: params.search,
      limit: params.limit,
      offset: params.offset,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[listTasksTool] failed:', error);
    return `任务列表获取失败: ${errorMsg}`;
  }
}

async function executeUpdateTask(params: {
  task_id: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  execution_notes?: string;
  linked_symbols?: string[];
}): Promise<string> {
  try {
    return await updateTaskBiz(params.task_id, {
      status: params.status,
      title: params.title,
      description: params.description,
      priority: params.priority,
      executionNotes: params.execution_notes,
      linkedSymbols: params.linked_symbols,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[updateTaskTool] failed:', error);
    return `任务更新失败: ${errorMsg}`;
  }
}

// ============== LangChain Tools ==============

export const createTaskTool = langchainTool(
  async (params): Promise<string> => {
    return executeCreateTask(params as z.infer<typeof CreateTaskParams>);
  },
  {
    name: 'createTaskTool',
    description: '创建投资任务（跟踪投资建议、监控条件、到期提醒等）',
    schema: CreateTaskParams,
  },
);

export const listTasksTool = langchainTool(
  async (params): Promise<string> => {
    return executeListTasks(params as z.infer<typeof ListTasksParams>);
  },
  {
    name: 'listTasksTool',
    description: '查询当前用户的任务列表（支持按状态、优先级、关键词过滤）',
    schema: ListTasksParams,
  },
);

export const updateTaskTool = langchainTool(
  async (params): Promise<string> => {
    return executeUpdateTask(params as z.infer<typeof UpdateTaskParams>);
  },
  {
    name: 'updateTaskTool',
    description: '更新投资任务（修改状态、标题、描述、优先级、执行备注等）',
    schema: UpdateTaskParams,
  },
);

// ============== Claude Tools ==============

export const createTaskClaudeTool = claudeTool(
  'createTaskTool',
  '创建投资任务（跟踪投资建议、监控条件、到期提醒等）',
  {
    title: z.string().describe('任务标题，必填'),
    description: z.string().optional().describe('任务描述或详细说明'),
    type: z.enum(['one_time', 'price_trigger', 'monitoring', 'date_driven']).optional().describe('任务类型，默认 one_time'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('优先级，默认 medium'),
    linked_symbols: z.array(z.string()).optional().describe('关联资产代号列表，如 ["AAPL", "NVDA"]'),
    due_date: z.string().optional().describe('截止日期（YYYY-MM-DD 格式）'),
    source_type: z.enum(['agent_chat', 'analysis_report', 'manual']).optional().describe('来源类型，默认 agent_chat'),
    source_id: z.string().optional().describe('来源ID（如聊天会话ID或报告ID）'),
  },
  async (args) => {
    try {
      const result = await executeCreateTask({
        title: String(args.title),
        description: args.description as string | undefined,
        type: (args.type as 'one_time' | 'price_trigger' | 'monitoring' | 'date_driven' | undefined),
        priority: (args.priority as 'low' | 'medium' | 'high' | 'urgent' | undefined),
        linked_symbols: args.linked_symbols as string[] | undefined,
        due_date: args.due_date as string | undefined,
        source_type: (args.source_type as 'agent_chat' | 'analysis_report' | 'manual' | undefined),
        source_id: args.source_id as string | undefined,
      });
      return { content: [{ type: 'text', text: result }] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[createTaskClaudeTool] failed:', error);
      return { content: [{ type: 'text', text: `任务创建失败: ${errorMsg}` }], isError: true };
    }
  },
);

export const listTasksClaudeTool = claudeTool(
  'listTasksTool',
  '查询当前用户的任务列表（支持按状态、优先级、关键词过滤）',
  {
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'expired']).optional().describe('按状态过滤'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('按优先级过滤'),
    search: z.string().optional().describe('搜索关键词（标题或描述）'),
    limit: z.number().optional().describe('每页数量，默认20'),
    offset: z.number().optional().describe('偏移量，默认0'),
  },
  async (args) => {
    try {
      const result = await executeListTasks({
        status: (args.status as 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'expired' | undefined),
        priority: (args.priority as 'low' | 'medium' | 'high' | 'urgent' | undefined),
        search: args.search as string | undefined,
        limit: args.limit as number | undefined,
        offset: args.offset as number | undefined,
      });
      return { content: [{ type: 'text', text: result }] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[listTasksClaudeTool] failed:', error);
      return { content: [{ type: 'text', text: `任务列表获取失败: ${errorMsg}` }], isError: true };
    }
  },
);

export const updateTaskClaudeTool = claudeTool(
  'updateTaskTool',
  '更新投资任务（修改状态、标题、描述、优先级、执行备注等）',
  {
    task_id: z.string().describe('要更新的任务ID'),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional().describe('新状态'),
    title: z.string().optional().describe('新标题'),
    description: z.string().optional().describe('新描述'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('新优先级'),
    execution_notes: z.string().optional().describe('执行备注（完成任务时记录执行结果）'),
    linked_symbols: z.array(z.string()).optional().describe('关联资产代号列表'),
  },
  async (args) => {
    try {
      const result = await executeUpdateTask({
        task_id: String(args.task_id),
        status: (args.status as 'pending' | 'in_progress' | 'completed' | 'cancelled' | undefined),
        title: args.title as string | undefined,
        description: args.description as string | undefined,
        priority: (args.priority as 'low' | 'medium' | 'high' | 'urgent' | undefined),
        execution_notes: args.execution_notes as string | undefined,
        linked_symbols: args.linked_symbols as string[] | undefined,
      });
      return { content: [{ type: 'text', text: result }] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[updateTaskClaudeTool] failed:', error);
      return { content: [{ type: 'text', text: `任务更新失败: ${errorMsg}` }], isError: true };
    }
  },
);
