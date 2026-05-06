'use client';

import React, { memo } from 'react';
import { Tag, Badge, Divider } from 'antd';
import { Flexbox } from 'react-layout-kit';
import { createStyles } from 'antd-style';
import { MessageSquare, FileSearch, Cpu, Clock, Coins, Hash } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SpanData } from '@renderer/store/observability/store';

const useStyles = createStyles(({ css, token }) => ({
  wrapper: css`
    padding: 4px 0;
  `,
  header: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  `,
  title: css`
    font-size: 14px;
    font-weight: 600;
  `,
  sectionTitle: css`
    font-size: 12px;
    font-weight: 500;
    color: ${token.colorTextSecondary};
    margin: 12px 0 6px;
  `,
  cardGrid: css`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    margin-bottom: 8px;
  `,
  infoCard: css`
    padding: 8px 10px;
    border-radius: ${token.borderRadius}px;
    background: ${token.colorFillQuaternary};
    display: flex;
    align-items: center;
    gap: 6px;
  `,
  infoIcon: css`
    width: 14px;
    height: 14px;
    opacity: 0.65;
    flex-shrink: 0;
  `,
  infoLabel: css`
    font-size: 11px;
    color: ${token.colorTextTertiary};
    white-space: nowrap;
  `,
  infoValue: css`
    font-size: 13px;
    font-weight: 500;
    color: ${token.colorText};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  attrBlock: css`
    padding: 10px 12px;
    border-radius: ${token.borderRadius}px;
    background: ${token.colorFillQuaternary};
    font-size: 12px;
    font-family: ${token.fontFamilyCode};
    color: ${token.colorText};
    overflow-x: auto;
  `,
  ioBlock: css`
    padding: 10px 12px;
    border-radius: ${token.borderRadius}px;
    background: ${token.colorFillQuaternary};
    font-size: 12px;
    color: ${token.colorText};
    border-left: 3px solid ${token.colorPrimary};
  `,
  ioContent: css`
    font-size: 12px;
    line-height: 1.5;
    color: ${token.colorText};
    max-height: 160px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: ${token.fontFamilyCode};
  `,
}));

interface SpanDetailProps {
  span: SpanData | null;
}

function formatDuration(ms?: number): string {
  if (ms === undefined) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`;
  const m = Math.floor(ms / 60_000);
  const s = ((ms % 60_000) / 1000).toFixed(1);
  return `${m}m${s}s`;
}

const InfoCard = memo<{ icon: React.ReactNode; label: string; value: string }>(({ icon, label, value }) => {
  const { styles } = useStyles();
  return (
    <div className={styles.infoCard}>
      <span className={styles.infoIcon}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <div className={styles.infoLabel}>{label}</div>
        <div className={styles.infoValue} title={value}>{value}</div>
      </div>
    </div>
  );
});
InfoCard.displayName = 'InfoCard';

const LLMCallDetail = memo<{ span: SpanData }>(({ span }) => {
  const { styles } = useStyles();
  const { t } = useTranslation('chat');
  const model = span.attributes?.model as string | undefined;
  const messageCount = span.attributes?.messageCount as number | undefined;
  const promptSummary = span.attributes?.promptSummary as string | undefined;
  const responseSummary = span.attributes?.responseSummary as string | undefined;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <MessageSquare size={16} style={{ color: '#1677ff' }} />
        <span className={styles.title}>{t('observability.span.llmCall')}</span>
        <Tag>{span.kind}</Tag>
        <Badge
          color={span.status === 'ok' ? 'green' : 'red'}
          text={span.status === 'ok' ? t('observability.status.success') : t('observability.status.error')}
        />
      </div>

      <div className={styles.cardGrid}>
        {model && <InfoCard icon={<Hash size={14} />} label={t('observability.model')} value={model} />}
        <InfoCard icon={<Clock size={14} />} label={t('observability.duration')} value={formatDuration(span.durationMs)} />
        <InfoCard icon={<Hash size={14} />} label={t('observability.inputTokens')} value={span.tokenInput?.toLocaleString() ?? '-'} />
        <InfoCard icon={<Hash size={14} />} label={t('observability.outputTokens')} value={span.tokenOutput?.toLocaleString() ?? '-'} />
        <InfoCard icon={<Coins size={14} />} label={t('observability.cost')} value={span.cost !== undefined ? `$${span.cost.toFixed(6)}` : '-'} />
        {messageCount !== undefined && (
          <InfoCard icon={<Hash size={14} />} label={t('observability.messages')} value={String(messageCount)} />
        )}
      </div>

      {promptSummary && (
        <>
          <div className={styles.sectionTitle}>{t('observability.inputPrompt')}</div>
          <div className={styles.ioBlock}>
            <pre className={styles.ioContent}>{promptSummary}</pre>
          </div>
        </>
      )}

      {responseSummary && (
        <>
          <div className={styles.sectionTitle}>{t('observability.output')}</div>
          <div className={styles.ioBlock} style={{ borderLeftColor: '#52c41a' }}>
            <pre className={styles.ioContent}>{responseSummary}</pre>
          </div>
        </>
      )}

      <Divider style={{ margin: '12px 0' }} />

      <div className={styles.sectionTitle}>{t('observability.rawAttributes')}</div>
      <div className={styles.attrBlock}>
        <pre style={{ margin: 0, fontSize: 11 }}>{JSON.stringify(span.attributes, null, 2)}</pre>
      </div>
    </div>
  );
});
LLMCallDetail.displayName = 'LLMCallDetail';

const ToolCallDetail = memo<{ span: SpanData }>(({ span }) => {
  const { styles } = useStyles();
  const { t } = useTranslation('chat');
  const toolName = span.attributes?.tool as string | undefined;
  const isError = span.attributes?.isError as boolean | undefined;
  const error = span.attributes?.error as string | undefined;
  const args = span.attributes?.args as Record<string, unknown> | undefined;
  const resultSummary = span.attributes?.resultSummary as string | undefined;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <FileSearch size={16} style={{ color: '#52c41a' }} />
        <span className={styles.title}>{t('observability.span.toolCall')}</span>
        <Tag>{span.kind}</Tag>
        <Badge
          color={span.status === 'ok' ? 'green' : 'red'}
          text={span.status === 'ok' ? t('observability.status.success') : t('observability.status.error')}
        />
      </div>

      <div className={styles.cardGrid}>
        {toolName && <InfoCard icon={<Hash size={14} />} label={t('observability.tool')} value={toolName} />}
        <InfoCard icon={<Clock size={14} />} label={t('observability.duration')} value={formatDuration(span.durationMs)} />
        {span.tokenInput !== undefined && (
          <InfoCard icon={<Hash size={14} />} label={t('observability.inputTokens')} value={span.tokenInput.toLocaleString()} />
        )}
        {span.tokenOutput !== undefined && (
          <InfoCard icon={<Hash size={14} />} label={t('observability.outputTokens')} value={span.tokenOutput.toLocaleString()} />
        )}
        {span.cost !== undefined && (
          <InfoCard icon={<Coins size={14} />} label={t('observability.cost')} value={`$${span.cost.toFixed(6)}`} />
        )}
      </div>

      {args && Object.keys(args).length > 0 && (
        <>
          <div className={styles.sectionTitle}>{t('observability.arguments')}</div>
          <div className={styles.ioBlock}>
            <pre className={styles.ioContent}>{JSON.stringify(args, null, 2)}</pre>
          </div>
        </>
      )}

      {resultSummary && (
        <>
          <div className={styles.sectionTitle}>{t('observability.result')}</div>
          <div className={styles.ioBlock} style={{ borderLeftColor: isError ? '#ff4d4f' : '#52c41a' }}>
            <pre className={styles.ioContent}>{resultSummary}</pre>
          </div>
        </>
      )}

      {error && (
        <>
          <div className={styles.sectionTitle}>{t('observability.status.error')}</div>
          <div className={styles.ioBlock} style={{ borderLeftColor: '#ff4d4f', background: '#fff2f0' }}>
            <pre className={styles.ioContent} style={{ color: '#cf1322' }}>{error}</pre>
          </div>
        </>
      )}

      <Divider style={{ margin: '12px 0' }} />

      <div className={styles.sectionTitle}>{t('observability.rawAttributes')}</div>
      <div className={styles.attrBlock}>
        <pre style={{ margin: 0, fontSize: 11 }}>{JSON.stringify(span.attributes, null, 2)}</pre>
      </div>
    </div>
  );
});
ToolCallDetail.displayName = 'ToolCallDetail';

const ContextCompressionDetail = memo<{ span: SpanData }>(({ span }) => {
  const { styles } = useStyles();
  const { t } = useTranslation('chat');
  const tokensBefore = span.attributes?.tokensBefore as number | undefined;
  const tokensAfter = span.attributes?.tokensAfter as number | undefined;
  const saved = span.attributes?.saved as number | undefined;
  const savedPct = tokensBefore && saved ? ((saved / tokensBefore) * 100).toFixed(1) : undefined;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <Cpu size={16} style={{ color: '#fa8c16' }} />
        <span className={styles.title}>{t('observability.span.contextCompression')}</span>
        <Tag>{span.kind}</Tag>
        <Badge color="blue" text={t('observability.status.internal')} />
      </div>

      <div className={styles.cardGrid}>
        <InfoCard icon={<Clock size={14} />} label={t('observability.duration')} value={formatDuration(span.durationMs)} />
        {tokensBefore !== undefined && (
          <InfoCard icon={<Hash size={14} />} label={t('observability.tokensBefore')} value={tokensBefore.toLocaleString()} />
        )}
        {tokensAfter !== undefined && (
          <InfoCard icon={<Hash size={14} />} label={t('observability.tokensAfter')} value={tokensAfter.toLocaleString()} />
        )}
        {saved !== undefined && (
          <InfoCard icon={<Hash size={14} />} label={t('observability.saved')} value={`${saved.toLocaleString()}${savedPct ? ` (${savedPct}%)` : ''}`} />
        )}
        {span.cost !== undefined && (
          <InfoCard icon={<Coins size={14} />} label={t('observability.cost')} value={`$${span.cost.toFixed(6)}`} />
        )}
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <div className={styles.sectionTitle}>{t('observability.rawAttributes')}</div>
      <div className={styles.attrBlock}>
        <pre style={{ margin: 0, fontSize: 11 }}>{JSON.stringify(span.attributes, null, 2)}</pre>
      </div>
    </div>
  );
});
ContextCompressionDetail.displayName = 'ContextCompressionDetail';

const SpanDetail = memo<SpanDetailProps>(({ span }) => {
  if (!span) return null;

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

SpanDetail.displayName = 'SpanDetail';

export default SpanDetail;
