import { Blocks } from 'lucide-react';
import { Suspense, memo } from 'react';
import { useTranslation } from 'react-i18next';

import { useSessionStore } from '@renderer/store/session';
import { sessionSelectors } from '@renderer/store/session/selectors';

import Action from '../components/Action';
import { useSkillsControls } from './useControls';

/**
 * Claude 和 Hermes 引擎工具面板：仅渲染 skills。
 * DeepAgents 引擎已移除，内置 plugins 面板随之下线。
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
 * 顶层 Tools 组件：统一渲染技能面板（Claude / Hermes）。
 * DeepAgents 引擎已移除，不再存在内置插件面板分支。
 */
const Tools = memo(() => {
  const { t } = useTranslation('setting');
  // 订阅以保持对引擎切换的响应，缺失/存量 deepagents 由 selector 归一为 hermes
  useSessionStore(sessionSelectors.currentSessionEngineType);

  return (
    <Suspense fallback={<Action disabled icon={Blocks} title={t('tool.title')} />}>
      <SkillsTools />
    </Suspense>
  );
});

export default Tools;