'use client';

import React, { memo, useMemo, useState } from 'react';
import { Badge, Divider } from 'antd';
import { Flexbox } from 'react-layout-kit';
import { createStyles } from 'antd-style';
import { Activity } from 'lucide-react';
import { useObservabilityStore } from '@renderer/store/observability/store';
import { useGlobalStore } from '@renderer/store/global';
import { systemStatusSelectors } from '@renderer/store/global/selectors';
import MetricsCard from './MetricsCard';
import TraceTimeline from './TraceTimeline';
import SpanDetail from './SpanDetail';

const useStyles = createStyles(({ css, token }) => ({
  container: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    background: ${token.colorBgLayout};
  `,
  header: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    font-weight: 600;
    font-size: 14px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,
  scroll: css`
    flex: 1;
    overflow-y: auto;
    padding: 12px;
  `,
  metricsRow: css`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  `,
  sectionTitle: css`
    font-size: 12px;
    font-weight: 500;
    color: ${token.colorTextSecondary};
    margin-bottom: 8px;
  `,
}));

const ObservabilityPanelContent = memo(() => {
  const { styles } = useStyles();
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);

  const activeTraceId = useObservabilityStore((s) => s.activeTraceId);
  const traces = useObservabilityStore((s) => s.traces);
  const spansByTraceId = useObservabilityStore((s) => s.spansByTraceId);
  const metrics = useObservabilityStore((s) => s.metrics);

  const activeTrace = useMemo(
    () => traces.find((t) => t.traceId === activeTraceId) ?? traces[traces.length - 1] ?? null,
    [traces, activeTraceId],
  );

  const activeSpans = useMemo(
    () => (activeTrace ? spansByTraceId[activeTrace.traceId] ?? [] : []),
    [activeTrace, spansByTraceId],
  );

  const selectedSpan = useMemo(
    () => activeSpans.find((s) => s.spanId === selectedSpanId) || null,
    [activeSpans, selectedSpanId],
  );

  const isLive = activeTrace?.status === 'running';

  const currentTokens = activeTrace?.totalTokens ?? 0;
  const currentCost = activeTrace?.totalCost ?? 0;
  const currentLatency = activeTrace?.durationMs ?? 0;
  const currentToolCalls = activeTrace?.toolCalls ?? 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Activity size={16} />
        <span>Observability</span>
        {isLive && (
          <Badge
            color="green"
            style={{ marginLeft: 'auto' }}
            text="Live"
          />
        )}
      </div>

      <div className={styles.scroll}>
        <div className={styles.metricsRow}>
          <MetricsCard
            label="Tokens"
            subValue={`累计 ${metrics.totalTokens.toLocaleString()}`}
            value={currentTokens.toLocaleString()}
          />
          <MetricsCard
            label="Cost"
            subValue={`累计 $${metrics.totalCost.toFixed(4)}`}
            value={`$${currentCost.toFixed(4)}`}
          />
          <MetricsCard
            label="Latency"
            subValue={`累计 ${(metrics.totalLatencyMs / 1000).toFixed(1)}s`}
            value={`${(currentLatency / 1000).toFixed(1)}s`}
          />
          <MetricsCard
            label="Tools"
            subValue={`累计 ${metrics.toolCallCount}`}
            value={`${currentToolCalls} calls`}
          />
        </div>

        <div className={styles.sectionTitle}>Execution Timeline</div>
        <TraceTimeline
          onSelectSpan={(id) => setSelectedSpanId(id)}
          selectedSpanId={selectedSpanId}
          spans={activeSpans}
        />

        {selectedSpan && (
          <>
            <Divider style={{ margin: '12px 0' }} />
            <SpanDetail span={selectedSpan} />
          </>
        )}
      </div>
    </div>
  );
});

ObservabilityPanelContent.displayName = 'ObservabilityPanelContent';

export default ObservabilityPanelContent;
