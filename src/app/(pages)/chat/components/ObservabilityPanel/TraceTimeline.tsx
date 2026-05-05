'use client';

import React, { memo, useState } from 'react';
import { Flexbox } from 'react-layout-kit';
import { createStyles } from 'antd-style';
import { ChevronDown, ChevronRight, Cpu, FileSearch, MessageSquare, Zap } from 'lucide-react';
import type { SpanData } from '@renderer/store/observability/store';

const useStyles = createStyles(({ css, token }) => ({
  row: css`
    display: flex;
    align-items: center;
    padding: 6px 8px;
    border-radius: ${token.borderRadius}px;
    cursor: pointer;
    transition: background 0.2s;
    &:hover {
      background: ${token.colorFillTertiary};
    }
  `,
  activeRow: css`
    background: ${token.colorFillSecondary} !important;
  `,
  indent: css`
    width: 16px;
    flex-shrink: 0;
  `,
  name: css`
    flex: 1;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  meta: css`
    font-size: 11px;
    color: ${token.colorTextTertiary};
    white-space: nowrap;
    margin-left: 8px;
  `,
  ok: css`
    color: ${token.colorSuccess};
  `,
  error: css`
    color: ${token.colorError};
  `,
  icon: css`
    width: 14px;
    height: 14px;
    margin-right: 6px;
    flex-shrink: 0;
    opacity: 0.7;
  `,
}));

interface TraceTimelineProps {
  spans: SpanData[];
  selectedSpanId?: string | null;
  onSelectSpan?: (spanId: string) => void;
}

const SpanIcon = memo<{ name: SpanData['name'] }>(({ name }) => {
  const { styles } = useStyles();
  switch (name) {
    case 'llm_call':
      return <MessageSquare className={styles.icon} size={14} />;
    case 'tool_call':
      return <FileSearch className={styles.icon} size={14} />;
    case 'context_compression':
      return <Cpu className={styles.icon} size={14} />;
    default:
      return <Zap className={styles.icon} size={14} />;
  }
});
SpanIcon.displayName = 'SpanIcon';

const SpanRow = memo<{
  span: SpanData;
  depth: number;
  selected: boolean;
  onSelect: (spanId: string) => void;
}>(({ span, depth, selected, onSelect }) => {
  const { styles, cx } = useStyles();
  const [expanded, setExpanded] = useState(true);
  const hasChildren = span.spanId !== undefined; // simplified: we don't track children explicitly in this list

  return (
    <div>
      <div
        className={cx(styles.row, selected && styles.activeRow)}
        onClick={() => {
          onSelect(span.spanId);
          setExpanded((v) => !v);
        }}
        role="button"
        tabIndex={0}
      >
        <div className={styles.indent} style={{ paddingLeft: depth * 16 }}>
          {hasChildren ? (
            expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <span style={{ width: 14, display: 'inline-block' }} />
          )}
        </div>
        <SpanIcon name={span.name} />
        <span className={styles.name}>{span.name}</span>
        <span className={styles.meta}>
          {span.durationMs !== undefined && `${(span.durationMs / 1000).toFixed(1)}s`}
          {span.tokenInput !== undefined && `  ${span.tokenInput}+${span.tokenOutput ?? 0} tok`}
        </span>
        <span className={cx(styles.meta, span.status === 'ok' ? styles.ok : styles.error)}>
          {span.status === 'ok' ? '✓' : '✗'}
        </span>
      </div>
    </div>
  );
});
SpanRow.displayName = 'SpanRow';

const TraceTimeline = memo<TraceTimelineProps>(({ spans, selectedSpanId, onSelectSpan }) => {
  // Build a simple flat list sorted by startTime with depth based on parentSpanId
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
      <Flexbox align="center" justify="center" padding={24} style={{ opacity: 0.5 }}>
        <span style={{ fontSize: 12 }}>暂无执行追踪数据</span>
      </Flexbox>
    );
  }

  return (
    <Flexbox gap={2}>
      {treeSpans.map(({ span, depth }) => (
        <SpanRow
          key={span.spanId}
          depth={depth}
          onSelect={(id) => onSelectSpan?.(id)}
          selected={selectedSpanId === span.spanId}
          span={span}
        />
      ))}
    </Flexbox>
  );
});

TraceTimeline.displayName = 'TraceTimeline';

export default TraceTimeline;
