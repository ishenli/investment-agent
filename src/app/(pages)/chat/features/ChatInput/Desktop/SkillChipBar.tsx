'use client';

import { Tag } from 'antd';
import { Sparkles } from 'lucide-react';
import { memo, useMemo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { useSessionStore } from '@renderer/store/session';
import { useChatStore } from '@renderer/store/chat';
import { useSkillsStore } from '@renderer/store/skills/store';

const SkillChipBar = memo(() => {
  const sessionId = useSessionStore((s) => s.activeId);
  const chatSessionId = useChatStore((s) => s.activeId);
  const [skills, sessionExplicitSlug, chatExplicitSlug, clearSessionExplicitSkill] =
    useSkillsStore((s) => [
      s.skills,
      s.sessionExplicitSkill[sessionId] ?? null,
      s.sessionExplicitSkill[chatSessionId] ?? null,
      s.clearSessionExplicitSkill,
    ]);
  const explicitSlug = sessionExplicitSlug ?? chatExplicitSlug;

  const skillName = useMemo(() => {
    if (!explicitSlug) return null;
    const skill = skills.find((s) => s.slug === explicitSlug);
    return skill?.name ?? explicitSlug;
  }, [explicitSlug, skills]);

  if (!explicitSlug || !skillName) return null;

  return (
    <Flexbox horizontal paddingInline={12}>
      <Tag
        closable
        color="blue"
        icon={<Sparkles size={12} style={{ marginRight: 4 }} />}
        onClose={() => {
          clearSessionExplicitSkill(sessionId);
          if (chatSessionId && chatSessionId !== sessionId) {
            clearSessionExplicitSkill(chatSessionId);
          }
        }}
        style={{ display: 'flex', alignItems: 'center', margin: 0 }}
      >
        {skillName}
      </Tag>
    </Flexbox>
  );
});

SkillChipBar.displayName = 'SkillChipBar';

export default SkillChipBar;
