'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'next/navigation';
import {
  IconRefresh,
  IconCheck,
  IconX,
  IconLoader2,
  IconFilter,
} from '@tabler/icons-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@renderer/components/ui/dialog';
import TraceDetailView, {
  type Trace,
  type Span,
  type SpanStats,
} from './TraceDetail';

interface TraceDetailData {
  trace: Trace;
  spans: Span[];
  spanTree: unknown[];
  stats: SpanStats;
}

export default function ObservabilityPage() {
  const { t } = useTranslation('setting');
  const searchParams = useSearchParams();
  const [traces, setTraces] = React.useState<Trace[]>([]);
  const [traceDetailMap, setTraceDetailMap] = React.useState<Record<string, TraceDetailData>>({});
  const [detailLoadingMap, setDetailLoadingMap] = React.useState<Record<string, boolean>>({});
  const [loading, setLoading] = React.useState(true);
  const [selectedTraceId, setSelectedTraceId] = React.useState<string | null>(null);

  // Filters
  const [sessionId, setSessionId] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState(searchParams.get('search') ?? '');

  // Pagination
  const [limit, setLimit] = React.useState(20);
  const [offset, setOffset] = React.useState(0);

  const fetchTraces = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sessionId) params.append('sessionId', sessionId);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await fetch(`/api/observability?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setTraces(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch traces:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionId, statusFilter, limit, offset]);

  const fetchTraceDetail = React.useCallback(async (traceId: string) => {
    setDetailLoadingMap((prev) => ({ ...prev, [traceId]: true }));
    try {
      const response = await fetch(`/api/observability/${traceId}`);
      const data = await response.json();

      if (data.success) {
        setTraceDetailMap((prev) => ({ ...prev, [traceId]: data.data }));
      }
    } catch (error) {
      console.error('Failed to fetch trace detail:', error);
    } finally {
      setDetailLoadingMap((prev) => ({ ...prev, [traceId]: false }));
    }
  }, []);

  React.useEffect(() => {
    fetchTraces();
  }, [fetchTraces]);

  const formatDuration = (ms: number | null) => {
    if (ms === null) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatCost = (cost: number) => {
    if (cost < 0.01) return `$${(cost * 1000).toFixed(4)}`;
    return `$${cost.toFixed(4)}`;
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2)}M`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
    return tokens.toLocaleString();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="gap-1 text-[10px] h-5 bg-green-600 hover:bg-green-700">
            <IconCheck className="h-3 w-3" />
            {t('observability.badgeCompleted', 'Completed')}
          </Badge>
        );
      case 'running':
        return (
          <Badge variant="secondary" className="gap-1 text-[10px] h-5">
            <IconLoader2 className="h-3 w-3 animate-spin" />
            {t('observability.badgeRunning', 'Running')}
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1 text-[10px] h-5">
            <IconX className="h-3 w-3" />
            {t('observability.badgeError', 'Error')}
          </Badge>
        );
      default:
        return <Badge className="text-[10px] h-5">{status}</Badge>;
    }
  };

  const filteredTraces = traces.filter((trace) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      trace.id.toLowerCase().includes(query) ||
      trace.agentName.toLowerCase().includes(query) ||
      trace.sessionId.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t('observability.title', 'Observability History')}
          </h2>
          <p className="text-muted-foreground">
            {t('observability.description', 'View Agent call traces and performance metrics')}
          </p>
        </div>
        <Button onClick={fetchTraces} disabled={loading}>
          <IconRefresh className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh', 'Refresh')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('observability.filters', 'Filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder={t('observability.searchPlaceholder', 'Search Trace ID / Agent name...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="w-[200px]">
              <Input
                placeholder={t('observability.sessionIdPlaceholder', 'Session ID')}
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t('observability.statusPlaceholder', 'Status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('observability.statusAll', 'All Status')}</SelectItem>
                <SelectItem value="completed">{t('observability.statusCompleted', 'Completed')}</SelectItem>
                <SelectItem value="running">{t('observability.statusRunning', 'Running')}</SelectItem>
                <SelectItem value="error">{t('observability.statusError', 'Error')}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setOffset(0);
                fetchTraces();
              }}
            >
              <IconFilter className="mr-2 h-4 w-4" />
              {t('observability.applyFilters', 'Apply Filters')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      {traces.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('observability.totalTokens', 'Total Tokens')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {formatTokens(traces.reduce((sum, tr) => sum + tr.totalTokens, 0))}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t('observability.total', 'Total')} {formatTokens(traces.reduce((sum, tr) => sum + tr.inputTokens + tr.outputTokens, 0))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('observability.totalCost', 'Total Cost')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {formatCost(traces.reduce((sum, tr) => sum + tr.totalCost, 0))}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t('observability.avgPerTrace', 'Avg per trace')} {formatCost(traces.reduce((sum, tr) => sum + tr.totalCost, 0) / traces.length)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('observability.avgLatency', 'Avg Latency')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {formatDuration(traces.reduce((sum, tr) => sum + (tr.latencyMs || 0), 0) / traces.length)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {traces.length} {t('observability.traces', 'traces')}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('observability.errorCount', 'Errors')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {traces.filter((tr) => tr.status === 'error').length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {((traces.filter((tr) => tr.status === 'error').length / traces.length) * 100).toFixed(1)}% {t('observability.errorRate', 'error rate')}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Traces List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('observability.traceRecords', 'Trace Records')}</CardTitle>
          <CardDescription>
            {t('observability.recordCount', '{{count}} records', { count: filteredTraces.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTraces.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('observability.noRecords', 'No trace records')}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTraces.map((trace) => (
                <div
                  key={trace.id}
                  className="rounded-lg border p-3 hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedTraceId(trace.id);
                    if (!traceDetailMap[trace.id] && !detailLoadingMap[trace.id]) {
                      fetchTraceDetail(trace.id);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate max-w-[400px]">
                            {trace.input || (trace.metadata as Record<string, unknown>)?.input as string || trace.id.slice(0, 12)}
                          </span>
                          {getStatusBadge(trace.status)}
                          {trace.metadata && !!(trace.metadata as Record<string, unknown>).reflectionTriggered && (
                            <Badge variant="outline" className="text-[10px] h-5">
                              {t('observability.reflectionTriggered', 'Reflection')}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          <span className="font-mono">{trace.id.slice(0, 12)}</span>
                          {' · '}
                          {trace.agentName} &middot; {formatDate(trace.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs flex-shrink-0">
                      <div className="flex flex-col items-end">
                        <span className="font-medium tabular-nums">{formatTokens(trace.totalTokens)}</span>
                        <span className="text-muted-foreground text-[10px]">tokens</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-medium tabular-nums">{formatCost(trace.totalCost)}</span>
                        <span className="text-muted-foreground text-[10px]">cost</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-medium tabular-nums">{formatDuration(trace.latencyMs)}</span>
                        <span className="text-muted-foreground text-[10px]">latency</span>
                      </div>
                      {trace.toolCallCount > 0 && (
                        <div className="flex flex-col items-end">
                          <span className="font-medium tabular-nums">{trace.toolCallCount}</span>
                          <span className="text-muted-foreground text-[10px]">tools</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Trace Detail Dialog */}
          {(() => {
            const selectedTrace = selectedTraceId ? filteredTraces.find((t) => t.id === selectedTraceId) : null;
            const detail = selectedTraceId ? traceDetailMap[selectedTraceId] : null;
            const isDetailLoading = selectedTraceId ? detailLoadingMap[selectedTraceId] : false;

            return (
              <Dialog open={!!selectedTrace} onOpenChange={(open) => { if (!open) setSelectedTraceId(null); }}>
                <DialogContent className="sm:max-w-[90vw] max-h-[85vh] overflow-y-auto">
                  {selectedTrace && (
                    <>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">
                            {selectedTrace.id.slice(0, 12)}
                          </span>
                          <span>{selectedTrace.agentName}</span>
                          {getStatusBadge(selectedTrace.status)}
                        </DialogTitle>
                        <DialogDescription>
                          {formatDate(selectedTrace.createdAt)}
                          {' · '}
                          {formatTokens(selectedTrace.totalTokens)} tokens
                          {' · '}
                          {formatCost(selectedTrace.totalCost)}
                          {' · '}
                          {formatDuration(selectedTrace.latencyMs)}
                        </DialogDescription>
                      </DialogHeader>
                      <TraceDetailView
                        loading={!!isDetailLoading}
                        spans={detail?.spans ?? []}
                        stats={detail?.stats ?? null}
                        trace={selectedTrace}
                      />
                    </>
                  )}
                </DialogContent>
              </Dialog>
            );
          })()}

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => {
                setOffset(Math.max(0, offset - limit));
              }}
            >
              {t('observability.prevPage', 'Previous')}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t('observability.paginationRange', 'Showing {{start}} - {{end}}', {
                start: offset + 1,
                end: offset + filteredTraces.length,
              })}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={filteredTraces.length < limit}
              onClick={() => {
                setOffset(offset + limit);
              }}
            >
              {t('observability.nextPage', 'Next')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
