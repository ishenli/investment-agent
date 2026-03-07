import { Avatar, ItemType } from '@lobehub/ui';
import isEqual from 'fast-deep-equal';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useCheckPluginsIsInstalled } from '@renderer/hooks/useCheckPluginsIsInstalled';
import { useFetchInstalledPlugins } from '@renderer/hooks/useFetchInstalledPlugins';
import { useSessionStore } from '@renderer/store/session';
import { sessionSelectors } from '@renderer/store/session/selectors';
import { useToolStore } from '@renderer/store/tool';
import { builtinToolSelectors } from '@renderer/store/tool/selectors';
import { useSkillsStore } from '@/app/store/skills/store';

import ToolItem from './ToolItem';

/**
 * 自订阅 SessionStore 的 plugin 工具项。
 * 在 Ant Design Menu items.label 中直接嵌入 JSX 时，父级 items 数组不会随 store 变化重新渲染，
 * 所以必须在组件内部自行订阅所需状态。
 */
export const PluginToolItem = ({ id, label, setUpdating }: {
  id: string;
  label?: string;
  setUpdating: (v: boolean) => void;
}) => {
  const checked = useSessionStore(sessionSelectors.currentSessionPlugins).includes(id);
  const togglePlugin = useSessionStore((s) => s.togglePlugin);
  return (
    <ToolItem
      checked={checked}
      id={id}
      label={label}
      onUpdate={async () => {
        setUpdating(true);
        await togglePlugin(id);
        setUpdating(false);
      }}
    />
  );
};

/**
 * 自订阅 SkillsStore 的 skill 工具项。
 * 同上原因：必须内部订阅 sessionActiveSkills 才能在 toggle 后正确反映勾选状态。
 */
export const SkillToolItem = ({ slug, name, sessionId }: {
  slug: string;
  name: string;
  sessionId: string;
}) => {
  const { skills, sessionActiveSkills, toggleSessionSkill } = useSkillsStore((s) => ({
    skills: s.skills,
    sessionActiveSkills: s.sessionActiveSkills,
    toggleSessionSkill: s.toggleSessionSkill,
  }));

  // 计算 checked：会话有覆盖时用会话快照，否则回退到全局 isEnabled
  const sessionSlugs = sessionActiveSkills[sessionId];
  const checked = sessionSlugs !== undefined
    ? sessionSlugs.includes(slug)
    : skills.find((s) => s.slug === slug)?.isEnabled ?? false;

  return (
    <ToolItem
      checked={checked}
      id={slug}
      label={name}
      onUpdate={async (_id, _enabled) => {
        toggleSessionSkill(sessionId, slug);
      }}
    />
  );
};

/**
 * DeepAgents 引擎专用：内置插件工具组。
 * updating 状态独立于 skills 工具组，避免引擎切换时状态残留。
 */
export const usePluginsControls = ({ setUpdating }: { setUpdating: (updating: boolean) => void }) => {
  const { t } = useTranslation('chat');
  const tStr = t as (key: string) => string;
  const { showDalle } = { showDalle: false };

  const plugins = useSessionStore(sessionSelectors.currentSessionPlugins);
  const builtinList = useToolStore(builtinToolSelectors.metaList(showDalle), isEqual);

  useFetchInstalledPlugins();
  useCheckPluginsIsInstalled(plugins);

  const items: ItemType[] = [
    {
      children: builtinList.map((item) => ({
        icon: <Avatar avatar={item.meta.avatar} size={20} style={{ flex: 'none' }} />,
        key: item.identifier,
        label: (
          <PluginToolItem
            id={item.identifier}
            label={item.meta?.title}
            setUpdating={setUpdating}
          />
        ),
      })),
      key: 'builtins',
      label: tStr('tools.plugins.groupName'),
      type: 'group' as const,
    },
  ];

  return items;
};

/**
 * Claude 引擎专用：技能工具组。
 * 独立于插件工具组，无 setUpdating 依赖（技能切换为同步操作）。
 */
export const useSkillsControls = () => {
  const { t } = useTranslation('chat');
  const tStr = t as (key: string) => string;

  const sessionId = useSessionStore((s) => s.activeId);
  const { fetchSkills, filteredSkills, skills } = useSkillsStore();

  useEffect(() => {
    if (skills.length === 0) {
      fetchSkills();
    }
  }, [fetchSkills, skills.length]);

  const enabledSkills = filteredSkills();

  const items: ItemType[] = enabledSkills.length > 0
    ? [
        {
          children: enabledSkills.map((skill) => ({
            key: `skill-${skill.slug}`,
            label: (
              <SkillToolItem
                slug={skill.slug}
                name={skill.name}
                sessionId={sessionId}
              />
            ),
          })),
          key: 'skills',
          label: tStr('tools.skills.groupName'),
          type: 'group' as const,
        },
      ]
    : [];

  return items;
};