import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, del } from '@/app/lib/request';
import { AssetMarketInfoType } from '@/types/marketInfo';
import { NoteType } from '@/server/service/noteService';
import { AssetMetaType } from '@/types/assetMeta';

// Types
export type ReportType = 'weekly' | 'monthly' | 'emergency';

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
  projectId: string; // accountId in API is often used as projectId in frontend context or similar
  accountId: string;
  type: ReportType;
  title: string;
  content: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
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
  const response = await get<{ success: boolean; data: { items: ReportListItem[]; totalCount: number } }>(
    `/api/report?${params.toString()}`
  );
  return response.data;
};

const fetchReport = async (id: string) => {
  const response = await get<{ success: boolean; data: ReportDetail }>(`/api/report/${id}`);
  return response.data;
};

const generateReport = async (payload: { type: ReportType; startDate?: string; endDate?: string }) => {
  const response = await post<{ success: boolean; data: { id: string; status: string } }>(
    '/api/report',
    payload
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
    // 如果报告正在生成中（内容包含特定关键词），则轮询
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.content === '报告生成中...' || data.content === '正在收集数据...' || data.content === '正在生成AI分析...')) {
        return 2000;
      }
      return false;
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
