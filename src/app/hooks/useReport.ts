import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, del } from '@/app/lib/request';
import { AssetMarketInfoType } from '@/types/marketInfo';
import { NoteType } from '@/server/service/noteService';
import { AssetMetaType } from '@/types/assetMeta';

// Types
export type ReportType = 'weekly' | 'monthly' | 'emergency';
export type AgentType = 'claude-sdk' | 'langchain';

export type ReportListItem = {
  id: string;
  title: string;
  type: ReportType;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
};

export type ReportDetail = {
  id: string;
  accountId: string;
  type: ReportType;
  title: string;
  content: string;
  startDate: string | null;
  endDate: string | null;
  // 报告生成进度
  generationProgress: number;
  generationStage: string | null;
  // 数据来源摘要
  dataSourceSummary: string | null;
  // 手动编辑标记
  isManuallyEdited: boolean;
  lastEditedAt: string | null;
  editCount: number;
  createdAt: string;
  updatedAt: string;
};

// 报告进度显示名称映射
export const STAGE_DISPLAY_NAMES: Record<string, string> = {
  data_aggregation: '数据聚合中',
  performance_calculation: '业绩计算中',
  ai_generation: 'AI 内容生成中',
  formatting: '格式化中',
  completed: '已完成',
};

// API Functions
const fetchReports = async (type?: ReportType, limit = 20, offset = 0) => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  if (type) params.append('type', type);

  // The API returns { success: true, data: { items: [], totalCount: 0 } }
  // get() returns the full JSON response
  const response = await get<{
    success: boolean;
    data: { items: ReportListItem[]; totalCount: number };
  }>(`/api/report?${params.toString()}`);
  return response.data;
};

const fetchReport = async (id: string) => {
  const response = await get<{ success: boolean; data: ReportDetail }>(`/api/report/${id}`);
  return response.data;
};

const generateReport = async (payload: {
  type: ReportType;
  startDate?: string;
  endDate?: string;
  modelSlug?: string;
  agentType?: AgentType;
}) => {
  const response = await post<{ success: boolean; data: { id: string; status: string } }>(
    '/api/report',
    payload,
  );
  return response.data;
};

const deleteReport = async (id: string) => {
  const response = await del<{ success: boolean; data: { message: string } }>(`/api/report/${id}`);
  return response.data;
};

// Hooks
export const useReports = (type?: ReportType, limit = 20, offset = 0) => {
  return useQuery({
    queryKey: ['reports', type, limit, offset],
    queryFn: () => fetchReports(type, limit, offset),
  });
};

export const useReport = (id: string) => {
  return useQuery({
    queryKey: ['report', id],
    queryFn: () => fetchReport(id),
    enabled: !!id,
    // 如果报告正在生成中，则轮询
    refetchInterval: (query) => {
      const data = query.state.data as ReportDetail | undefined;
      if (!data) return false;

      // 已完成或失败则停止轮询
      const terminalStages = ['已完成', '生成失败'];
      if (
        terminalStages.includes(data.generationStage || '') ||
        data.generationProgress >= 100
      ) {
        return false;
      }

      // 指数退避：初始5秒，每轮1.3倍增长，最高30秒
      const attempts = query.state.dataUpdateCount;
      return Math.min(5000 * Math.pow(1.3, Math.min(attempts, 10)), 30000);
    },
  });
};

export const useGenerateReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateReport,
    onSuccess: () => {
      // Invalidate reports list to show the new one
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};

export const useDeleteReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteReport(id),
    onSuccess: (_, variables) => {
      // Invalidate reports list
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      // Remove detail from cache if it exists
      queryClient.removeQueries({ queryKey: ['report', variables.id] });
    },
  });
};
