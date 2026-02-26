/**
 * useAgents Hook
 *
 * 获取数据库中的 Agent 列表
 */
import { useQuery } from '@tanstack/react-query';
import { get } from '@renderer/lib/request';
import type { AgentTypeResponse } from '@typings/agent';

interface AgentsResponse {
  success: boolean;
  data: AgentTypeResponse[];
}

/**
 * 获取所有 Agent 列表
 */
export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const response: AgentsResponse = await get('/api/agent');
      if (response.success) {
        return response.data;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000, // 5 分钟
  });
}

/**
 * 获取内置 Agent 列表
 */
export function useBuiltinAgents() {
  return useQuery({
    queryKey: ['agents', 'builtin'],
    queryFn: async () => {
      const response: AgentsResponse = await get('/api/agent?isBuiltin=true');
      if (response.success) {
        return response.data;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取自定义 Agent 列表
 */
export function useCustomAgents() {
  return useQuery({
    queryKey: ['agents', 'custom'],
    queryFn: async () => {
      const response: AgentsResponse = await get('/api/agent?isBuiltin=false');
      if (response.success) {
        return response.data;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export type { AgentTypeResponse as Agent };