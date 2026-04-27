import { createStyles } from 'antd-style';
import { Select, Icon } from '@lobehub/ui';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';
import { Brain, Sparkles, Check, Zap } from 'lucide-react';

import { useSessionStore } from '@renderer/store/session';
import { sessionSelectors } from '@renderer/store/session/selectors';

const useStyles = createStyles(({ css, token }) => ({
  select: css`
    width: 180px;


    .ant-select-selection-item {
      padding: 0 !important;
    }

    .ant-select-arrow {
      color: ${token.colorText};
    }
  `,
  option: css`
    .ant-select-item-option-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `,
}));

const EngineSwitch = () => {
  const { styles } = useStyles();

  // 直接订阅 engineType，确保状态变化时重新渲染
  const engineType = useSessionStore(sessionSelectors.currentSessionEngineType);

  const updateAgentConfig = useSessionStore((s) => s.updateAgentConfig);
  const handleEngineChange = async (value: 'deepagents' | 'claude' | 'hermes') => {
    const sessionId = useSessionStore.getState().activeId;
    if (sessionId) {
      console.log('[EngineSwitch] Changing engine to:', value);
      await updateAgentConfig({ engineType: value });
    }
  };

  const engines = [
    {
      value: 'deepagents',
      icon: Brain,
      label: 'DeepAgents',
      description: '多 Agent 协作系统',
    },
    {
      value: 'claude',
      icon: Sparkles,
      label: 'Claude SDK',
      description: 'Anthropic Claude Agent SDK',
    },
    {
      value: 'hermes',
      icon: Zap,
      label: 'Hermes Agent',
      description: '多 Provider Tool-Calling Agent',
    },
  ];

  return (
    <Select
      defaultValue="deepagents"
      className={styles.select}
      value={engineType}
      onChange={handleEngineChange}
      options={engines.map((engine) => ({
        value: engine.value,
        label: (
          <Flexbox horizontal align="center" gap={6}>
            <Icon icon={engine.icon} size={16} />
            <span>{engine.label}</span>
            {engineType === engine.value && <Icon icon={Check} size={14} />}
          </Flexbox>
        ),
      }))}
      variant="borderless"
      popupClassName={styles.option}
    />
  );
};

EngineSwitch.displayName = 'EngineSwitch';

export default EngineSwitch;