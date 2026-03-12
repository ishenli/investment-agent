import { Blocks } from 'lucide-react';
import { Suspense, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSessionStore } from '@renderer/store/session';
import { sessionSelectors } from '@renderer/store/session/selectors';

import Action from '../components/Action';
import { usePluginsControls, useSkillsControls } from './useControls';

/**
 * DeepAgents 引擎专用工具面板：仅渲染内置 plugins。
 * updating 状态完全隔离，不受 skills 分支影响。
 */
const PluginsTools = memo(() => {
  const { t } = useTranslation('setting');
  const [updating, setUpdating] = useState(false);
  const items = usePluginsControls({ setUpdating });

  return (
    <Action
      dropdown={{
        maxHeight: 500,
        maxWidth: 480,
        menu: { items },
        minWidth: 320,
      }}
      icon={Blocks}
      loading={updating}
      showTooltip={false}
      title={t('tool.title')}
    />
  );
});

/**
 * Claude 引擎专用工具面板：仅渲染 skills。
 * 无 loading 状态（技能切换为同步操作）。
 */
const SkillsTools = memo(() => {
  const { t } = useTranslation('setting');
  const items = useSkillsControls();

  return (
    <Action
      dropdown={{
        maxHeight: 500,
        maxWidth: 480,
        menu: { items },
        minWidth: 320,
      }}
      icon={Blocks}
      showTooltip={false}
      title={t('tool.title')}
    />
  );
});

/**
 * 顶层 Tools 组件：根据 engineType 条件渲染对应工具面板。
 * 通过拆分组件确保 checkbox 状态、loading 状态完全隔离，互不干扰。
 */
const Tools = memo(() => {
  const { t } = useTranslation('setting');
  const engineType = useSessionStore((s) => {
    const session = sessionSelectors.currentSession(s);
    return session?.config?.engineType || 'deepagents';
  });

  return (
    <Suspense fallback={<Action disabled icon={Blocks} title={t('tool.title')} />}>
      {engineType === 'claude' ? <SkillsTools /> : <PluginsTools />}
    </Suspense>
  );
});

export default Tools;
