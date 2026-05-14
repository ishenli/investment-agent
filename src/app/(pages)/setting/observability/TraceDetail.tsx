'use client';

import React, { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@renderer/components/ui/badge';
import { Separator } from '@renderer/components/ui/separator';
import {
  MessageSquare,
  FileSearch,
  Cpu,
  Zap,
  Clock,
  Coins,
  Hash,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Activity,
} from 'lucide-react';

// ==================== Types ====================
export interface Trace {
  id: string;
  sessionId: string;
  topicId: string | null;
  agentName: string;
  status: 'running' | 'completed' | 'error';
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  inputCost: number;
  outputCost: number;
  latencyMs: number;
  toolCallCount: number;
  error: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Span {
  id: string;
  traceId: string;
  parentSpanId: string | null;
  name: 'llm_call' | 'tool_call' | 'context_compression' | string;
  kind: 'client' | 'internal';
  status: 'ok' | 'error';
  startTime: string | number;
  endTime: string | number | null;
  durationMs: number | null;
  tokenInput: number | null;
  tokenOutput: number | null;
  cost: number | null;
  attributes: Record<string, unknown> | null;
}

export interface SpanStats {
  totalSpans: number;
  errorSpans: number;
  avgDurationMs: number;
  byName: Record<string, { count: number; avgDurationMs: number; errorCount: number }>;
}

// ==================== Constants ====================
const SPAN_COLORS: Record<string, { bar: string; text: string }> = {
  llm_call: { bar: 'bg-blue-500', text: 'text-blue-500' },
  tool_call: { bar: 'bg-green-500', text: 'text-green-500' },
  context_compression: { bar: 'bg-orange-500', text: 'text-orange-500' },
};

function getSpanColor(name: string) {
  return SPAN_COLORS[name] ?? { bar: 'bg-slate-500', text: 'text-slate-500' };
}

// ==================== Helpers ====================
function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = ((ms % 60_000) / 1000).toFixed(0);
  return `${m}m${s}s`;
}

function toTimestamp(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function formatTokens(tokens: number | null | undefined): string {
  if (tokens === null || tokens === undefined) return '-';
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toLocaleString();
}

function buildSpanTree(spans: Span[]): { span: Span; depth: number }[] {
  const depthMap = new Map<string, number>();
  const sorted = [...spans].sort((a, b) => toTimestamp(a.startTime) - toTimestamp(b.startTime));
  return sorted.map((span) => {
    const depth = span.parentSpanId ? (depthMap.get(span.parentSpanId) ?? 0) + 1 : 0;
    depthMap.set(span.id, depth);
    return { span, depth };
  });
}

function getSpanLabel(span: Span, t: any): string | null {
  if (span.name === 'llm_call' && span.attributes?.model) {
    return String(span.attributes.model);
  }
  if (span.name === 'tool_call' && span.attributes?.tool) {
    return String(span.attributes.tool);
  }
  if (span.name === 'context_compression') {
    const saved = span.attributes?.saved;
    if (typeof saved === 'number') return `${saved} ${t('observability.tokensShort', 'tokens')}`;
  }
  return null;
}

function getDisplayName(name: string, t: any): string {
  if (name === 'llm_call') return t('observability.span.llmCall', 'LLM Call');
  if (name === 'tool_call') return t('observability.span.toolCall', 'Tool Call');
  if (name === 'context_compression') return t('observability.span.contextCompression', 'Context Compression');
  return name;
}

// ==================== Sub Components ====================
const SpanIcon = memo<{ name: string }>(({ name }) => {
  switch (name) {
    case 'llm_call':
      return <MessageSquare className="w-3.5 h-3.5 text-blue-500" />;
    case 'tool_call':
      return <FileSearch className="w-3.5 h-3.5 text-green-500" />;
    case 'context_compression':
      return <Cpu className="w-3.5 h-3.5 text-orange-500" />;
    default:
      return <Zap className="w-3.5 h-3.5 text-slate-500" />;
  }
});
SpanIcon.displayName = 'SpanIcon';

const InfoCard = memo<{ icon: React.ReactNode; label: string; value: string }>(({ icon, label, value }) => {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-md bg-muted/60">
      <span className="w-4 h-4 opacity-60 flex-shrink-0">{icon}</span>
      <div className="min-w-0 overflow-hidden">
        <div className="text-[11px] text-muted-foreground whitespace-nowrap">{label}</div>
        <div className="text-[13px] font-medium truncate" title={value}>{value}</div>
      </div>
    </div>
  );
});
InfoCard.displayName = 'InfoCard';

const LLMCallDetail = memo<{ span: Span }>(({ span }) => {
  const { t } = useTranslation('setting');
  const model = span.attributes?.model as string | undefined;
  const messageCount = span.attributes?.messageCount as number | undefined;
  const fullPrompt = span.attributes?.prompt as string | undefined;
  const promptSummary = span.attributes?.promptSummary as string | undefined;
  const fullResponse = span.attributes?.response as string | undefined;
  const responseSummary = span.attributes?.responseSummary as string | undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <MessageSquare className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-semibold">{t('observability.span.llmCall', 'LLM Call')}</span>
        <Badge variant="outline" className="text-xs">{span.kind}</Badge>
        <Badge
          className="text-xs"
          variant={span.status === 'ok' ? 'default' : 'destructive'}
        >
          {span.status === 'ok' ? t('observability.status.success', 'Success') : t('observability.status.error', 'Error')}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {model && <InfoCard icon={<Hash className="w-4 h-4" />} label={t('observability.model', 'Model')} value={model} />}
        <InfoCard icon={<Clock className="w-4 h-4" />} label={t('observability.duration', 'Duration')} value={formatDuration(span.durationMs)} />
        <InfoCard icon={<Hash className="w-4 h-4" />} label={t('observability.inputTokens', 'Input Tokens')} value={formatTokens(span.tokenInput)} />
        <InfoCard icon={<Hash className="w-4 h-4" />} label={t('observability.outputTokens', 'Output Tokens')} value={formatTokens(span.tokenOutput)} />
        <InfoCard icon={<Coins className="w-4 h-4" />} label={t('observability.cost', 'Cost')} value={span.cost != null ? `$${span.cost.toFixed(6)}` : '-'} />
        {messageCount !== undefined && (
          <InfoCard icon={<Hash className="w-4 h-4" />} label={t('observability.messages', 'Messages')} value={String(messageCount)} />
        )}
      </div>

      {(fullPrompt || promptSummary) && (
        <>
          <div className="text-xs font-medium text-muted-foreground mt-2">{t('observability.inputPrompt', 'Input Prompt')}</div>
          <div className="border-l-2 border-primary bg-muted/30 rounded-r-md p-3">
            <pre className="text-xs leading-relaxed whitespace-pre-wrap break-words overflow-y-auto max-h-40 font-mono">{fullPrompt || promptSummary}</pre>
          </div>
        </>
      )}

      {(fullResponse || responseSummary) && (
        <>
          <div className="text-xs font-medium text-muted-foreground mt-2">{t('observability.output', 'Output')}</div>
          <div className="border-l-2 border-green-500 bg-muted/30 rounded-r-md p-3">
            <pre className="text-xs leading-relaxed whitespace-pre-wrap break-words overflow-y-auto max-h-40 font-mono">{fullResponse || responseSummary}</pre>
          </div>
        </>
      )}

      <Separator className="my-2" />

      <div className="text-xs font-medium text-muted-foreground">{t('observability.rawAttributes', 'Raw Attributes')}</div>
      <div className="bg-muted/60 rounded-md p-3 overflow-x-auto">
        <pre className="text-[11px] font-mono">{JSON.stringify(span.attributes, null, 2)}</pre>
      </div>
    </div>
  );
});
LLMCallDetail.displayName = 'LLMCallDetail';

const ToolCallDetail = memo<{ span: Span }>(({ span }) => {
  const { t } = useTranslation('setting');
  const toolName = span.attributes?.tool as string | undefined;
  const isError = span.attributes?.isError as boolean | undefined;
  const error = span.attributes?.error as string | undefined;
  const args = span.attributes?.args as Record<string, unknown> | undefined;
  const argsFull = span.attributes?.argsFull as string | undefined;
  const resultSummary = span.attributes?.resultSummary as string | undefined;
  const resultFull = span.attributes?.resultFull as string | undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <FileSearch className="w-4 h-4 text-green-500" />
        <span className="text-sm font-semibold">{t('observability.span.toolCall', 'Tool Call')}</span>
        <Badge variant="outline" className="text-xs">{span.kind}</Badge>
        <Badge
          className="text-xs"
          variant={span.status === 'ok' ? 'default' : 'destructive'}
        >
          {span.status === 'ok' ? t('observability.status.success', 'Success') : t('observability.status.error', 'Error')}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {toolName && <InfoCard icon={<Hash className="w-4 h-4" />} label={t('observability.tool', 'Tool')} value={toolName} />}
        <InfoCard icon={<Clock className="w-4 h-4" />} label={t('observability.duration', 'Duration')} value={formatDuration(span.durationMs)} />
        {span.tokenInput !== null && <InfoCard icon={<Hash className="w-4 h-4" />} label={t('observability.inputTokens', 'Input Tokens')} value={formatTokens(span.tokenInput)} />}
        {span.tokenOutput !== null && <InfoCard icon={<Hash className="w-4 h-4" />} label={t('observability.outputTokens', 'Output Tokens')} value={formatTokens(span.tokenOutput)} />}
        {span.cost !== null && <InfoCard icon={<Coins className="w-4 h-4" />} label={t('observability.cost', 'Cost')} value={`$${span.cost.toFixed(6)}`} />}
      </div>

      {(argsFull || (args && Object.keys(args).length > 0)) && (
        <>
          <div className="text-xs font-medium text-muted-foreground mt-2">{t('observability.arguments', 'Arguments')}</div>
          <div className="border-l-2 border-primary bg-muted/30 rounded-r-md p-3">
            <pre className="text-xs leading-relaxed whitespace-pre-wrap break-words overflow-y-auto max-h-40 font-mono">{argsFull || JSON.stringify(args, null, 2)}</pre>
          </div>
        </>
      )}

      {(resultFull || resultSummary) && (
        <>
          <div className="text-xs font-medium text-muted-foreground mt-2">{t('observability.result', 'Result')}</div>
          <div
            className="border-l-2 bg-muted/30 rounded-r-md p-3"
            style={isError ? { borderLeftColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.05)' } : { borderLeftColor: '#22c55e' }}
          >
            <pre
              className="text-xs leading-relaxed whitespace-pre-wrap break-words overflow-y-auto max-h-40 font-mono"
              style={isError ? { color: '#b91c1c' } : undefined}
            >
              {resultFull || resultSummary}
            </pre>
          </div>
        </>
      )}

      {error && (
        <>
          <div className="text-xs font-medium text-destructive mt-2">{t('observability.status.error', 'Error')}</div>
          <div className="border-l-2 border-destructive bg-destructive/5 rounded-r-md p-3">
            <pre className="text-xs leading-relaxed whitespace-pre-wrap break-words overflow-y-auto max-h-40 font-mono text-destructive">{error}</pre>
          </div>
        </>
      )}

      <Separator className="my-2" />

      <div className="text-xs font-medium text-muted-foreground">{t('observability.rawAttributes', 'Raw Attributes')}</div>
      <div className="bg-muted/60 rounded-md p-3 overflow-x-auto">
        <pre className="text-[11px] font-mono">{JSON.stringify(span.attributes, null, 2)}</pre>
      </div>
    </div>
  );
});
ToolCallDetail.displayName = 'ToolCallDetail';

const ContextCompressionDetail = memo<{ span: Span }>(({ span }) => {
  const { t } = useTranslation('setting');
  const tokensBefore = span.attributes?.tokensBefore as number | undefined;
  const tokensAfter = span.attributes?.tokensAfter as number | undefined;
  const saved = span.attributes?.saved as number | undefined;
  const savedPct = tokensBefore && saved ? ((saved / tokensBefore) * 100).toFixed(1) : undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Cpu className="w-4 h-4 text-orange-500" />
        <span className="text-sm font-semibold">{t('observability.span.contextCompression', 'Context Compression')}</span>
        <Badge variant="outline" className="text-xs">{span.kind}</Badge>
        <Badge variant="secondary" className="text-xs">{t('observability.status.internal', 'Internal')}</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <InfoCard icon={<Clock className="w-4 h-4" />} label={t('observability.duration', 'Duration')} value={formatDuration(span.durationMs)} />
        {tokensBefore !== undefined && <InfoCard icon={<Hash className="w-4 h-4" />} label={t('observability.tokensBefore', 'Tokens Before')} value={tokensBefore.toLocaleString()} />}
        {tokensAfter !== undefined && <InfoCard icon={<Hash className="w-4 h-4" />} label={t('observability.tokensAfter', 'Tokens After')} value={tokensAfter.toLocaleString()} />}
        {saved !== undefined && <InfoCard icon={<Hash className="w-4 h-4" />} label={t('observability.saved', 'Saved')} value={`${saved.toLocaleString()}${savedPct ? ` (${savedPct}%)` : ''}`} />}
        {span.cost !== null && <InfoCard icon={<Coins className="w-4 h-4" />} label={t('observability.cost', 'Cost')} value={`$${span.cost.toFixed(6)}`} />}
      </div>

      <Separator className="my-2" />

      <div className="text-xs font-medium text-muted-foreground">{t('observability.rawAttributes', 'Raw Attributes')}</div>
      <div className="bg-muted/60 rounded-md p-3 overflow-x-auto">
        <pre className="text-[11px] font-mono">{JSON.stringify(span.attributes, null, 2)}</pre>
      </div>
    </div>
  );
});
ContextCompressionDetail.displayName = 'ContextCompressionDetail';

const SpanDetailPanel = memo<{ span: Span | null }>(({ span }) => {
  const { t } = useTranslation('setting');
  if (!span) {
    return (
      <div className="flex items-center justify-center py-6 text-sm text-muted-foreground border rounded-lg border-dashed">
        <Activity className="w-4 h-4 mr-2 opacity-50" />
        {t('observability.selectSpanHint', 'Click a span to view details')}
      </div>
    );
  }

  switch (span.name) {
    case 'llm_call':
      return <LLMCallDetail span={span} />;
    case 'tool_call':
      return <ToolCallDetail span={span} />;
    case 'context_compression':
      return <ContextCompressionDetail span={span} />;
    default:
      return <LLMCallDetail span={span} />;
  }
});
SpanDetailPanel.displayName = 'SpanDetailPanel';

const SpanRow = memo<{
  span: Span;
  depth: number;
  selected: boolean;
  onSelect: (spanId: string) => void;
  totalDuration: number;
  traceStart: number;
}>(({ span, depth, selected, onSelect, totalDuration, traceStart }) => {
  const { t } = useTranslation('setting');
  const [expanded] = useState(true);
  const hasChildren = false;

  const color = getSpanColor(span.name);
  const label = getSpanLabel(span, t);

  const spanStart = toTimestamp(span.startTime);
  const startOffset = totalDuration > 0 ? ((spanStart - traceStart) / totalDuration) * 100 : 0;
  const barWidth = totalDuration > 0 && span.durationMs
    ? Math.max(2, (span.durationMs / totalDuration) * 100)
    : 2;

  const displayName = getDisplayName(span.name, t);

  return (
    <div>
      <div
        className={`
          flex items-center py-2 px-2 rounded-md cursor-pointer transition-all border
          ${selected ? 'bg-accent border-primary' : 'border-transparent hover:bg-muted/60 hover:border-border'}
        `}
        onClick={() => onSelect(span.id)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(span.id); }}
        role="button"
        tabIndex={0}
      >
        <div style={{ width: depth * 16, flexShrink: 0 }} />
        <div className="w-4 flex-shrink-0 flex items-center justify-center">
          {hasChildren ? (
            expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <span className="inline-block w-3.5" />
          )}
        </div>

        <div className="flex items-center flex-1 min-w-0 gap-2">
          <SpanIcon name={span.name} />
          <span className="text-[13px] font-medium whitespace-nowrap">{displayName}</span>
          {label && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground truncate max-w-[120px]">
              {label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 ml-3 flex-shrink-0">
          {/* Gantt bar */}
          <div className="w-[120px] h-3.5 bg-muted rounded-sm relative flex-shrink-0 overflow-hidden">
            <div
              className={`h-full absolute rounded-sm opacity-85 ${color.bar}`}
              style={{ left: `${startOffset}%`, width: `${barWidth}%` }}
            />
          </div>

          {span.durationMs != null && (
            <span className="text-[11px] text-muted-foreground w-12 text-right tabular-nums">
              {formatDuration(span.durationMs)}
            </span>
          )}

          {(span.tokenInput != null || span.tokenOutput != null) && (
            <span className="text-[11px] text-muted-foreground w-16 text-right tabular-nums">
              {(span.tokenInput ?? 0) + (span.tokenOutput ?? 0)} {t('observability.tokensShort', 'tk')}
            </span>
          )}

          {span.cost != null && span.cost > 0 && (
            <span className="text-[11px] text-muted-foreground w-14 text-right tabular-nums">
              ${span.cost.toFixed(4)}
            </span>
          )}

          <span
            className={`text-[11px] w-4 text-center font-semibold ${
              span.status === 'ok' ? 'text-green-600' : 'text-destructive'
            }`}
          >
            {span.status === 'ok' ? '✓' : '✗'}
          </span>
        </div>
      </div>
    </div>
  );
});
SpanRow.displayName = 'SpanRow';

// ==================== Main Component ====================
interface TraceDetailViewProps {
  trace: Trace;
  spans: Span[];
  stats: SpanStats | null;
  loading: boolean;
}

export default function TraceDetailView({ trace, spans, stats, loading }: TraceDetailViewProps) {
  const { t } = useTranslation('setting');
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);

  const { traceStart, totalDuration } = useMemo(() => {
    if (spans.length === 0) return { traceStart: 0, totalDuration: 0 };
    const starts = spans.map((s) => toTimestamp(s.startTime));
    const ends = spans.map((s) => (s.endTime ? toTimestamp(s.endTime) : toTimestamp(s.startTime)));
    const start = Math.min(...starts);
    const end = Math.max(...ends);
    return { traceStart: start, totalDuration: Math.max(1, end - start) };
  }, [spans]);

  const treeSpans = useMemo(() => buildSpanTree(spans), [spans]);
  const selectedSpan = useMemo(
    () => spans.find((s) => s.id === selectedSpanId) || null,
    [spans, selectedSpanId],
  );

  const handleSelectSpan = (spanId: string) => {
    setSelectedSpanId((prev) => (prev === spanId ? null : spanId));
  };

  if (loading) {
    return (
      <div className="mt-2 ml-8 p-6 rounded-lg bg-muted/50 flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="mt-2 ml-8 p-4 rounded-lg bg-muted/50 space-y-4">
      {/* Trace Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">{t('observability.sessionId', 'Session ID')}</span>
          <span className="font-mono text-xs truncate" title={trace.sessionId}>{trace.sessionId}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">{t('observability.topicId', 'Topic ID')}</span>
          <span className="font-mono text-xs truncate">{trace.topicId || '-'}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">{t('observability.agent', 'Agent')}</span>
          <span className="truncate">{trace.agentName}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">{t('observability.status', 'Status')}</span>
          <span className="capitalize">{trace.status}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">{t('observability.inputTokens', 'Input Tokens')}</span>
          <span className="font-mono tabular-nums">{formatTokens(trace.inputTokens)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">{t('observability.outputTokens', 'Output Tokens')}</span>
          <span className="font-mono tabular-nums">{formatTokens(trace.outputTokens)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">{t('observability.inputCost', 'Input Cost')}</span>
          <span className="font-mono tabular-nums">${trace.inputCost.toFixed(6)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">{t('observability.outputCost', 'Output Cost')}</span>
          <span className="font-mono tabular-nums">${trace.outputCost.toFixed(6)}</span>
        </div>
      </div>

      {/* Error Banner */}
      {trace.error && (
        <div className="p-3 rounded-md border border-destructive/50 bg-destructive/10">
          <div className="font-medium text-destructive text-sm mb-1 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            {t('observability.errorMessage', 'Error')}
          </div>
          <pre className="text-xs overflow-auto whitespace-pre-wrap break-words">{trace.error}</pre>
        </div>
      )}

      {/* Span Stats Summary */}
      {stats && (
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">{t('observability.spanStats', 'Span Stats')}:</span>
            <Badge variant="outline">{stats.totalSpans} spans</Badge>
          </div>
          {stats.errorSpans > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{t('observability.errorSpans', 'Error Spans')}:</span>
              <Badge variant="destructive">{stats.errorSpans}</Badge>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">{t('observability.avgDuration', 'Avg Duration')}:</span>
            <span>{formatDuration(stats.avgDurationMs)}</span>
          </div>
        </div>
      )}

      {/* Spans Gantt Timeline */}
      {spans.length > 0 && (
        <div className="space-y-2">
          {/* Timeline Header */}
          <div className="flex items-center px-2 py-1 text-[11px] text-muted-foreground">
            <span className="flex-1">{t('observability.executionTimeline', 'Execution Timeline')}</span>
            <div className="w-[120px] h-1 bg-muted rounded-sm mx-3 relative flex-shrink-0 overflow-hidden">
              <div className="absolute inset-0 bg-black/5 rounded-sm" />
            </div>
            <span className="w-12 text-right tabular-nums">{formatDuration(totalDuration)}</span>
          </div>

          {/* Span Rows */}
          <div className="space-y-0.5">
            {treeSpans.map(({ span, depth }) => (
              <SpanRow
                key={span.id}
                depth={depth}
                onSelect={handleSelectSpan}
                selected={selectedSpanId === span.id}
                span={span}
                totalDuration={totalDuration}
                traceStart={traceStart}
              />
            ))}
          </div>

          {/* Selected Span Detail */}
          <div className="pt-2">
            <SpanDetailPanel span={selectedSpan} />
          </div>
        </div>
      )}
    </div>
  );
}
