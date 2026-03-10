import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, del } from '@/app/lib/request';

// Types
export type SnapshotSource = 'scheduled' | 'manual' | 'backfill';

export interface PositionSnapshot {
  symbol: string;
  quantity: number;
  averagePriceCents: number;
  currentPriceCents: number;
  marketValueCents: number;
  unrealizedGainLossCents: number;
  sector?: string;
}

export interface SnapshotPositions {
  positions: PositionSnapshot[];
  totalPositionsValueCents: number;
  positionCount: number;
}

export interface SnapshotRecord {
  id: number;
  accountId: number;
  snapshotDate: string;
  totalValueCents: number;
  cashBalanceCents: number;
  positions: SnapshotPositions;
  benchmarkValueCents: number | null;
  benchmarkSymbol: string;
  source: SnapshotSource;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SnapshotListResponse {
  items: SnapshotRecord[];
  totalCount: number;
  limit: number;
  offset: number;
}

// API Functions
const fetchSnapshots = async (startDate?: string, endDate?: string, limit = 50, offset = 0) => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await get<{ success: boolean; data: SnapshotListResponse }>(
    `/api/snapshot?${params.toString()}`,
  );
  return response.data;
};

const fetchSnapshot = async (id: number) => {
  const response = await get<{ success: boolean; data: SnapshotRecord }>(`/api/snapshot/${id}`);
  return response.data;
};

const createSnapshot = async (payload: { date?: string; source?: SnapshotSource }) => {
  const response = await post<{ success: boolean; data: SnapshotRecord }>(
    '/api/snapshot',
    payload,
  );
  return response.data;
};

const deleteSnapshot = async (id: number) => {
  const response = await del<{ success: boolean; data: { message: string } }>(
    `/api/snapshot/${id}`,
  );
  return response.data;
};

// Hooks
export const useSnapshots = (startDate?: string, endDate?: string, limit = 50, offset = 0) => {
  return useQuery({
    queryKey: ['snapshots', startDate, endDate, limit, offset],
    queryFn: () => fetchSnapshots(startDate, endDate, limit, offset),
  });
};

export const useSnapshot = (id: number | null) => {
  return useQuery({
    queryKey: ['snapshot', id],
    queryFn: () => fetchSnapshot(id!),
    enabled: !!id,
  });
};

export const useCreateSnapshot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSnapshot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
    },
  });
};

export const useDeleteSnapshot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: number }) => deleteSnapshot(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
    },
  });
};

// 辅助函数：格式化金额（cents to dollars）
export const formatCentsToDollars = (cents: number): string => {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// 辅助函数：计算收益率
export const calculateReturnPercentage = (
  currentValueCents: number,
  costBasisCents: number,
): number => {
  if (costBasisCents === 0) return 0;
  return ((currentValueCents - costBasisCents) / costBasisCents) * 100;
};

// 快照差值结构
export interface SnapshotDiff {
  totalValueDiffCents: number;
  totalValueDiffPct: number;
  positionValueDiffCents: number;
  positionValueDiffPct: number;
  cashBalanceDiffCents: number;
  cashBalanceDiffPct: number;
  positionCountDiff: number;
}

// 辅助函数：计算两个快照之间的差值（current 相对于 prev）
export const computeSnapshotDiff = (
  current: SnapshotRecord,
  prev: SnapshotRecord,
): SnapshotDiff => {
  const safePct = (diff: number, base: number) =>
    base !== 0 ? (diff / base) * 100 : 0;

  const totalDiff = current.totalValueCents - prev.totalValueCents;
  const posDiff =
    current.positions.totalPositionsValueCents -
    prev.positions.totalPositionsValueCents;
  const cashDiff = current.cashBalanceCents - prev.cashBalanceCents;
  const countDiff =
    current.positions.positionCount - prev.positions.positionCount;

  return {
    totalValueDiffCents: totalDiff,
    totalValueDiffPct: safePct(totalDiff, prev.totalValueCents),
    positionValueDiffCents: posDiff,
    positionValueDiffPct: safePct(posDiff, prev.positions.totalPositionsValueCents),
    cashBalanceDiffCents: cashDiff,
    cashBalanceDiffPct: safePct(cashDiff, prev.cashBalanceCents),
    positionCountDiff: countDiff,
  };
};