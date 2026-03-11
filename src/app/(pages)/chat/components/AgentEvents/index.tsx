import { ActionIcon, Icon } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronRight, Cpu, WrenchIcon, InfoIcon } from 'lucide-react';
import { rgba } from 'polished';
import React, { CSSProperties, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';
import { get } from 'lodash';

import { AgentEventEntry } from '@typings/message/base';

const useStyles = createStyles(({ css, token }) => ({
  container: css`
    overflow: hidden;
    border-radius: ${token.borderRadius}px;
    color: ${token.colorTextTertiary};
    transition: all 0.2s ${token.motionEaseOut};
  `,
  contentList: css`
    padding-block-start: 4px;
    padding-block-end: 8px;
    padding-inline: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  `,
  expand: css`
    color: ${token.colorTextTertiary};
  `,
  header: css`
    padding-block: 4px;
    padding-inline: 8px 4px;
    transition: background 0.2s ${token.motionEaseOut};
    transition: all 0.2s ${token.motionEaseOut};

    &:hover {
      background: ${token.colorFillQuaternary};
    }
  `,
  headerExpand: css`
    color: ${token.colorTextSecondary};
  `,
  shinyText: css`
    color: ${rgba(token.colorText, 0.45)};

    background: linear-gradient(
      120deg,
      ${rgba(token.colorTextBase, 0)} 40%,
      ${token.colorTextSecondary} 50%,
      ${rgba(token.colorTextBase, 0)} 60%
    );
    background-clip: text;
    background-size: 200% 100%;

    animation: shine 1.5s linear infinite;

    @keyframes shine {
      0% {
        background-position: 100%;
      }

      100% {
        background-position: -100%;
      }
    }
  `,
  eventItem: css`
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding-block: 3px;
    padding-inline: 4px;
    border-radius: 4px;
    font-size: 12px;
    color: ${token.colorTextSecondary};
    line-height: 1.5;

    &:hover {
      background: ${token.colorFillTertiary};
    }
  `,
  eventIcon: css`
    flex-shrink: 0;
    margin-top: 1px;
    opacity: 0.65;
  `,
  eventLabel: css`
    font-weight: 500;
    color: ${token.colorTextTertiary};
    flex-shrink: 0;
    min-width: 48px;
  `,
  eventContent: css`
    color: ${token.colorTextSecondary};
    word-break: break-all;
    font-family: ${token.fontFamilyCode};
    font-size: 11px;
  `,
  statusError: css`
    color: ${token.colorError};
  `,
  statusWarning: css`
    color: ${token.colorWarning};
  `,
}));

/**
 * 从 tool_use 事件中提取简短的参数摘要文本
 */
function getToolArgsSummary(event: AgentEventEntry): string {
  if (event.eventType !== 'tool_use' || !event.arguments) return '';
  const args = event.arguments as Record<string, unknown>;

  if (event.toolName === 'Skill') {
    const skill = get(args, 'skill');
    const skillArgs = get(args, 'args');
    if (skill) return skillArgs ? `${skill}(${skillArgs})` : String(skill);
  }
  if (event.toolName === 'Bash') {
    const command = get(args, 'command');
    if (command) return String(command);
  }
  if (event.toolName === 'Glob') {
    const pattern = get(args, 'pattern');
    if (pattern) return String(pattern);
  }
  if (event.toolName === 'Write' || event.toolName === 'Edit') {
    const filePath = get(args, 'file_path');
    if (filePath) return String(filePath);
  }
  if (event.toolName === 'Read') {
    const filePath = get(args, 'file_path');
    if (filePath) return String(filePath);
  }

  // 通用处理：取第一个字符串参数值（截断）
  const firstVal = Object.values(args).find((v) => typeof v === 'string');
  if (firstVal) {
    const str = String(firstVal);
    return str.length > 60 ? str.slice(0, 60) + '…' : str;
  }
  return '';
}

interface AgentEventRowProps {
  event: AgentEventEntry;
}

const AgentEventRow = memo<AgentEventRowProps>(({ event }) => {
  const { styles, cx } = useStyles();

  if (event.eventType === 'tool_use') {
    const argsSummary = getToolArgsSummary(event);
    return (
      <div className={styles.eventItem}>
        <span className={styles.eventIcon}>
          <WrenchIcon size={12} />
        </span>
        <span className={styles.eventLabel}>{event.toolName}</span>
        {argsSummary && <span className={styles.eventContent}>{argsSummary}</span>}
      </div>
    );
  }

  // status event
  const isError = event.level === 'error';
  const isWarning = event.level === 'warning';
  return (
    <div className={styles.eventItem}>
      <span className={cx(styles.eventIcon, isError && styles.statusError, isWarning && styles.statusWarning)}>
        <InfoIcon size={12} />
      </span>
      <span className={cx(styles.eventContent, isError && styles.statusError, isWarning && styles.statusWarning)}>
        {event.message}
      </span>
    </div>
  );
});

AgentEventRow.displayName = 'AgentEventRow';

interface AgentEventsProps {
  events?: AgentEventEntry[];
  running?: boolean;
  style?: CSSProperties;
}

const AgentEvents = memo<AgentEventsProps>((props) => {
  const { events, running, style } = props;
  const { t } = useTranslation(['components']);
  const { styles, cx, theme } = useStyles();

  // 完全由用户交互控制，默认折叠
  const [expanded, setExpanded] = useState(false);
  const showDetail = expanded;

  if (!events || events.length === 0) return null;

  const count = events.length;

  return (
    <Flexbox
      className={cx(styles.container, showDetail && styles.expand)}
      style={style}
      width={'100%'}
    >
      <Flexbox
        className={cx(styles.header, showDetail && styles.headerExpand)}
        distribution={'space-between'}
        flex={1}
        gap={8}
        horizontal
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer' }}
        width={'100%'}
      >
        {running ? (
          <Flexbox align={'center'} gap={8} horizontal width={'100%'}>
            <Icon color={theme.colorWarning} icon={Cpu} />
            <Flexbox className={styles.shinyText} horizontal>
              {t('agentEvents.running', { ns: 'components' })}
            </Flexbox>
          </Flexbox>
        ) : (
          <Flexbox align={'center'} gap={8} horizontal width={'100%'}>
            <Icon color={showDetail ? theme.colorWarning : undefined} icon={Cpu} />
            <Flexbox>
              {count > 0
                ? t('agentEvents.completedWithCount', { ns: 'components', count })
                : t('agentEvents.completed', { ns: 'components' })}
            </Flexbox>
          </Flexbox>
        )}
        <Flexbox gap={4} horizontal>
          <ActionIcon icon={showDetail ? ChevronDown : ChevronRight} size={'small'} />
        </Flexbox>
      </Flexbox>
      <AnimatePresence initial={false}>
        {showDetail && (
          <motion.div
            animate="open"
            exit="collapsed"
            initial="collapsed"
            style={{ overflow: 'hidden' }}
            transition={{
              duration: 0.2,
              ease: [0.4, 0, 0.2, 1],
            }}
            variants={{
              collapsed: { opacity: 0, height: 0 },
              open: { opacity: 1, height: 'auto' },
            }}
          >
            <div className={styles.contentList}>
              {events.map((event, index) => (
                <AgentEventRow
                  key={event.id ?? `${event.eventType}-${index}`}
                  event={event}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Flexbox>
  );
});

AgentEvents.displayName = 'AgentEvents';

export default AgentEvents;
