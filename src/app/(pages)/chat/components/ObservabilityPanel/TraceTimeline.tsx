'use client';

import React, { memo, useState } from 'react';
import { Flexbox } from 'react-layout-kit';
import { createStyles } from 'antd-style';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Cpu,
  FileSearch,
  MessageSquare,
  Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SpanData } from '@renderer/store/observability/store';

const SPAN_COLORS: Record<SpanData['name'], { bar: string; bg: string; light: string }> = {
  llm_call: { bar: '#1677ff', bg: '#e6f4ff', light: '#bae0ff' },
  tool_call: { bar: '#52c41a', bg: '#f6ffed', light: '#d9f7be' },
  skill_use: { bar: '#13c2c2', bg: '#e6fffb', light: '#b5f5ec' },
  context_compression: { bar: '#fa8c16', bg: '#fff7e6', light: '#ffe7ba' },
  reflection: { bar: '#722ed1', bg: '#f9f0ff', light: '#efdbff' },
  background_review: { bar: '#eb2f96', bg: '#fff0f6', light: '#ffd6e7' },
  background_review_audit: { bar: '#eb2f96', bg: '#fff0f6', light: '#ffd6e7' },
  background_review_skill_gen: { bar: '#eb2f96', bg: '#fff0f6', light: '#ffd6e7' },
};

const useStyles = createStyles(({ css, token }) => ({
  container: css`
    display: flex;
    flex-direction: column;
  `,
  timelineHeader: css`
    display: flex;
    align-items: center;
    padding: 4px 8px;
    margin-bottom: 4px;
    font-size: 11px;
    color: ${token.colorTextTertiary};
  `,
  timelineBarContainer: css`
    flex: 1;
    height: 4px;
    background: ${token.colorFillTertiary};
    border-radius: 2px;
    margin: 0 8px;
    position: relative;
  `,
  timelineBar: css`
    height: 100%;
    border-radius: 2px;
    transition: all 0.2s;
  `,
  row: css`
    display: flex;
    align-items: center;
    padding: 8px 10px;
    border-radius: ${token.borderRadius}px;
    cursor: pointer;
    transition: background 0.15s;
    border: 1px solid transparent;
    &:hover {
      background: ${token.colorFillQuaternary};
      border-color: ${token.colorBorderSecondary};
    }
  `,
  activeRow: css`
    background: ${token.colorFillTertiary} !important;
    border-color: ${token.colorPrimary} !important;
  `,
  rowLeft: css`
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    gap: 6px;
  `,
  rowRight: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: 8px;
    flex-shrink: 0;
  `,
  indent: css`
    width: 16px;
    flex-shrink: 0;
  `,
  name: css`
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
  `,
  tag: css`
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 4px;
    background: ${token.colorFillTertiary};
    color: ${token.colorTextTertiary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
  `,
  meta: css`
    font-size: 11px;
    color: ${token.colorTextTertiary};
    white-space: nowrap;
  `,
  ok: css`
    color: ${token.colorSuccess};
    font-weight: 600;
  `,
  error: css`
    color: ${token.colorError};
    font-weight: 600;
  `,
  icon: css`
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    opacity: 0.8;
  `,
  ganttContainer: css`
    width: 120px;
    height: 14px;
    background: ${token.colorFillTertiary};
    border-radius: 3px;
    position: relative;
    flex-shrink: 0;
    overflow: hidden;
  `,
  ganttBar: css`
    height: 100%;
    border-radius: 3px;
    position: absolute;
    opacity: 0.85;
    transition: opacity 0.2s;
  `,
  ganttCurrent: css`
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: ${token.colorError};
    opacity: 0.5;
    z-index: 2;
  `,
  empty: css`
    text-align: center;
    padding: 24px;
    font-size: 12px;
    color: ${token.colorTextTertiary};
    opacity: 0.7;
  `,
}));

interface TraceTimelineProps {
  spans: SpanData[];
  selectedSpanId?: string | null;
  onSelectSpan?: (spanId: string) => void;
}

const SpanIcon = memo<{ name: SpanData['name'] }>(({ name }) => {
  switch (name) {
    case 'llm_call':
      return <MessageSquare className="w-3.5 h-3.5" style={{ color: SPAN_COLORS.llm_call.bar }} />;
    case 'tool_call':
      return <FileSearch className="w-3.5 h-3.5" style={{ color: SPAN_COLORS.tool_call.bar }} />;
    case 'skill_use':
      return <BookOpen className="w-3.5 h-3.5" style={{ color: SPAN_COLORS.skill_use.bar }} />;
    case 'context_compression':
      return <Cpu className="w-3.5 h-3.5" style={{ color: SPAN_COLORS.context_compression.bar }} />;
    default:
      return <Zap className="w-3.5 h-3.5" />;
  }
});
SpanIcon.displayName = 'SpanIcon';

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = ((ms % 60_000) / 1000).toFixed(0);
  return `${m}m${s}s`;
}

const SpanRow = memo<{
  span: SpanData;
  depth: number;
  selected: boolean;
  onSelect: (spanId: string) => void;
  totalDuration: number;
  traceStart: number;
}>(({ span, depth, selected, onSelect, totalDuration, traceStart }) => {
  const { styles, cx } = useStyles();
  const { t } = useTranslation('chat');
  const [expanded, setExpanded] = useState(true);
  const hasChildren = false;

  function getSpanLabel(s: SpanData): string | null {
    if (s.name === 'llm_call' && s.attributes?.model) {
      return String(s.attributes.model);
    }
    if (s.name === 'tool_call' && s.attributes?.tool) {
      return String(s.attributes.tool);
    }
    if (s.name === 'skill_use') {
      return String(
        s.attributes?.skillName ?? s.attributes?.skillAction ?? s.attributes?.tool ?? '',
      );
    }
    if (s.name === 'context_compression') {
      const saved = s.attributes?.saved;
      if (typeof saved === 'number') return `${saved} ${t('observability.tokensShort')}`;
    }
    return null;
  }

  const color = SPAN_COLORS[span.name] ?? SPAN_COLORS.llm_call;
  const label = getSpanLabel(span);

  const startOffset = totalDuration > 0 ? ((span.startTime - traceStart) / totalDuration) * 100 : 0;
  const barWidth =
    totalDuration > 0 && span.durationMs ? Math.max(2, (span.durationMs / totalDuration) * 100) : 2;

  const displayName =
    span.name === 'llm_call'
      ? t('observability.span.llmCall')
      : span.name === 'tool_call'
        ? t('observability.span.toolCall')
        : span.name === 'skill_use'
          ? t('observability.span.skillUse')
          : t('observability.span.contextCompression');

  return (
    <div>
      <div
        className={cx(styles.row, selected && styles.activeRow)}
        onClick={() => onSelect(span.spanId)}
        role="button"
        tabIndex={0}
      >
        <div style={{ width: depth * 16, flexShrink: 0 }} />
        <div className={styles.indent}>
          {hasChildren ? (
            expanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )
          ) : (
            <span style={{ width: 14, display: 'inline-block' }} />
          )}
        </div>

        <div className={styles.rowLeft}>
          <SpanIcon name={span.name} />
          <span className={styles.name}>{displayName}</span>
          {label && <span className={styles.tag}>{label}</span>}
        </div>

        <div className={styles.rowRight}>
          <div className={styles.ganttContainer}>
            <div
              className={styles.ganttBar}
              style={{
                left: `${startOffset}%`,
                width: `${barWidth}%`,
                background: color.bar,
              }}
            />
          </div>

          {span.durationMs !== undefined && (
            <span className={styles.meta} style={{ minWidth: 48, textAlign: 'right' }}>
              {formatDuration(span.durationMs)}
            </span>
          )}

          {(span.tokenInput !== undefined || span.tokenOutput !== undefined) && (
            <span className={styles.meta} style={{ minWidth: 60, textAlign: 'right' }}>
              {(span.tokenInput ?? 0) + (span.tokenOutput ?? 0)} {t('observability.tokensShort')}
            </span>
          )}

          {span.cost !== undefined && span.cost > 0 && (
            <span className={styles.meta} style={{ minWidth: 50, textAlign: 'right' }}>
              ${span.cost.toFixed(4)}
            </span>
          )}

          <span
            className={cx(styles.meta, span.status === 'ok' ? styles.ok : styles.error)}
            style={{ minWidth: 14, textAlign: 'center' }}
          >
            {span.status === 'ok' ? '✓' : '✗'}
          </span>
        </div>
      </div>
    </div>
  );
});
SpanRow.displayName = 'SpanRow';

const TraceTimeline = memo<TraceTimelineProps>(({ spans, selectedSpanId, onSelectSpan }) => {
  const { styles } = useStyles();
  const { t } = useTranslation('chat');

  const { traceStart, traceEnd, totalDuration } = React.useMemo(() => {
    if (spans.length === 0) return { traceStart: 0, traceEnd: 0, totalDuration: 0 };
    const start = Math.min(...spans.map((s) => s.startTime));
    const end = Math.max(...spans.map((s) => s.endTime ?? s.startTime));
    return { traceStart: start, traceEnd: end, totalDuration: Math.max(1, end - start) };
  }, [spans]);

  const treeSpans = React.useMemo(() => {
    const depthMap = new Map<string, number>();
    const sorted = [...spans].sort((a, b) => a.startTime - b.startTime);
    return sorted.map((span) => {
      const depth = span.parentSpanId ? (depthMap.get(span.parentSpanId) ?? 0) + 1 : 0;
      depthMap.set(span.spanId, depth);
      return { span, depth };
    });
  }, [spans]);

  if (spans.length === 0) {
    return (
      <Flexbox align="center" justify="center" padding={24} className={styles.empty}>
        <span>{t('observability.noTraceData')}</span>
      </Flexbox>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.timelineHeader}>
        <span>{t('observability.timeline')}</span>
        <div className={styles.timelineBarContainer}>
          <div
            className={styles.timelineBar}
            style={{ width: '100%', background: 'rgba(0,0,0,0.06)' }}
          />
        </div>
        <span>{formatDuration(totalDuration)}</span>
      </div>

      <Flexbox gap={2}>
        {treeSpans.map(({ span, depth }) => (
          <SpanRow
            depth={depth}
            key={span.spanId}
            onSelect={(id) => onSelectSpan?.(id)}
            selected={selectedSpanId === span.spanId}
            span={span}
            totalDuration={totalDuration}
            traceStart={traceStart}
          />
        ))}
      </Flexbox>
    </div>
  );
});

TraceTimeline.displayName = 'TraceTimeline';

export default TraceTimeline;
