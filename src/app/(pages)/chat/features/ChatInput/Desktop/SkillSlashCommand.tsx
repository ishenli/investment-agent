'use client';

import { createStyles } from 'antd-style';
import { Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CSSProperties, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import { useChatStore } from '@renderer/store/chat';
import { useSessionStore } from '@renderer/store/session';
import { sessionSelectors } from '@renderer/store/session/selectors';
import { useSkillsStore } from '@/app/store/skills/store';

const useStyles = createStyles(({ css, token }) => ({
  container: css`
    position: absolute;
    left: 8px;
    right: 8px;
    z-index: 100;

    max-height: 280px;
    overflow-y: auto;

    background: ${token.colorBgElevated};
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
    box-shadow: ${token.boxShadowSecondary};
  `,
  empty: css`
    padding: 24px 16px;

    font-size: 13px;
    color: ${token.colorTextSecondary};
    text-align: center;
  `,
  footer: css`
    display: flex;
    gap: 6px;
    align-items: center;

    padding: 8px 16px;

    font-size: 13px;
    color: ${token.colorTextSecondary};
    cursor: pointer;

    border-top: 1px solid ${token.colorBorderSecondary};

    &:hover {
      color: ${token.colorText};
    }
  `,
  groupLabel: css`
    padding: 8px 16px 4px;

    font-size: 12px;
    color: ${token.colorTextTertiary};
  `,
  icon: css`
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;

    width: 28px;
    height: 28px;

    font-size: 16px;

    background: ${token.colorFillTertiary};
    border-radius: ${token.borderRadius}px;
  `,
  item: css`
    display: flex;
    gap: 10px;
    align-items: center;

    margin: 2px 4px;
    padding: 8px 12px;

    cursor: pointer;
    border-radius: ${token.borderRadius}px;
  `,
  itemActive: css`
    background: ${token.colorFillSecondary};
  `,
  itemDescription: css`
    overflow: hidden;

    font-size: 13px;
    color: ${token.colorTextDescription};
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  itemName: css`
    font-size: 14px;
    font-weight: 500;
    color: ${token.colorText};
    white-space: nowrap;
  `,
}));

interface SkillSlashCommandProps {
  chatInputExpand?: boolean;
}

const SkillSlashCommand = memo<SkillSlashCommandProps>(({ chatInputExpand }) => {
  const { styles, cx } = useStyles();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const sessionId = useSessionStore((s) => s.activeId);
  const engineType = useSessionStore(sessionSelectors.currentSessionEngineType);
  const [chatSessionId, inputMessage, updateInputMessage] = useChatStore((s) => [
    s.activeId,
    s.inputMessage,
    s.updateInputMessage,
  ]);
  const [skills, setSessionExplicitSkill] = useSkillsStore((s) => [
    s.skills,
    s.setSessionExplicitSkill,
  ]);

  const isSupported = engineType === 'claude' || engineType === 'hermes';

  const slashFilter = useMemo(() => {
    if (!isSupported || !inputMessage) return null;
    const match = inputMessage.match(/^\/(\S*)$/);
    return match ? match[1] : null;
  }, [isSupported, inputMessage]);

  const isOpen = slashFilter !== null;

  const filteredSkills = useMemo(() => {
    if (!isOpen) return [];
    const enabled = skills.filter((s) => s.isEnabled);
    if (!slashFilter) return enabled;
    const q = slashFilter.toLowerCase();
    return enabled.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q),
    );
  }, [isOpen, slashFilter, skills]);

  useEffect(() => {
    setActiveIndex(0);
  }, [slashFilter]);

  const handleSelect = useCallback(
    (slug: string) => {
      setSessionExplicitSkill(sessionId, slug);
      if (chatSessionId && chatSessionId !== sessionId) {
        setSessionExplicitSkill(chatSessionId, slug);
      }
      updateInputMessage('');
    },
    [chatSessionId, sessionId, setSessionExplicitSkill, updateInputMessage],
  );

  useEffect(() => {
    if (!isOpen || filteredSkills.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      const target = e.target as HTMLElement;
      if (target.tagName !== 'TEXTAREA') return;

      switch (e.key) {
        case 'ArrowUp': {
          e.preventDefault();
          e.stopPropagation();
          setActiveIndex((prev) => (prev <= 0 ? filteredSkills.length - 1 : prev - 1));
          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          e.stopPropagation();
          setActiveIndex((prev) => (prev >= filteredSkills.length - 1 ? 0 : prev + 1));
          break;
        }
        case 'Enter': {
          e.preventDefault();
          e.stopPropagation();
          const skill = filteredSkills[activeIndex];
          if (skill) handleSelect(skill.slug);
          break;
        }
        case 'Escape': {
          e.preventDefault();
          e.stopPropagation();
          updateInputMessage('');
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, filteredSkills, activeIndex, handleSelect, updateInputMessage]);

  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, activeIndex]);

  if (!isOpen) return null;

  const positionStyle: CSSProperties =
    chatInputExpand ? { top: 24, marginTop: 0 } : { bottom: '100%', marginBottom: 4 };

  return (
    <div className={styles.container} ref={listRef} style={positionStyle}>
      <div className={styles.groupLabel}>个人技能</div>
      {filteredSkills.length === 0 ? (
        <div className={styles.empty}>
          {slashFilter ? `没有匹配 "${slashFilter}" 的技能` : '没有可用的技能'}
        </div>
      ) : (
        filteredSkills.map((skill, index) => (
          <div
            className={cx(styles.item, index === activeIndex && styles.itemActive)}
            data-index={index}
            key={skill.slug}
            onClick={() => handleSelect(skill.slug)}
            onMouseEnter={() => setActiveIndex(index)}
          >
            <span className={styles.icon}>{skill.icon || '⚡'}</span>
            <Flexbox
              align={'center'}
              gap={8}
              horizontal
              style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}
            >
              <span className={styles.itemName}>{skill.name}</span>
              {skill.description && (
                <span className={styles.itemDescription}>{skill.description}</span>
              )}
            </Flexbox>
          </div>
        ))
      )}
      <div className={styles.footer} onClick={() => router.push('/setting/skills')}>
        <Settings size={14} />
        管理技能
      </div>
    </div>
  );
});

SkillSlashCommand.displayName = 'SkillSlashCommand';

export default SkillSlashCommand;
