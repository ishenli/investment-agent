import { createStyles } from 'antd-style';
import { Select, Icon } from '@lobehub/ui';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';
import { Bot, Lightbulb, MessageCircleQuestion, Check } from 'lucide-react';

import { useSessionStore } from '@renderer/store/session';
import { sessionSelectors } from '@renderer/store/session/selectors';

const useStyles = createStyles(({ css, token }) => ({
  select: css`
    min-width: 120px;

    .ant-select-selector {
      border-radius: 16px !important;
      background: ${token.colorFillTertiary} !important;
      border: none !important;
      padding: 4px 12px !important;
      height: auto !important;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s ease;

      &:hover {
        background: ${token.colorFillSecondary} !important;
      }
    }

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

type ClaudeModeType = 'code' | 'plan' | 'ask';

const ClaudeModeSwitch = () => {
  const { styles } = useStyles();

  // 获取当前引擎类型和模式
  const engineType = useSessionStore((s) => {
    const session = sessionSelectors.currentSession(s);
    return session?.config?.engineType || 'deepagents';
  });

  const currentMode = useSessionStore((s) => {
    const session = sessionSelectors.currentSession(s);
    return (session?.config?.claudeMode as ClaudeModeType) || 'code';
  });

  const updateAgentConfig = useSessionStore((s) => s.updateAgentConfig);

  const handleModeChange = async (value: ClaudeModeType) => {
    const sessionId = useSessionStore.getState().activeId;
    if (sessionId) {
      console.log('[ClaudeModeSwitch] Changing mode to:', value);
      await updateAgentConfig({ claudeMode: value });
    }
  };

  const modes = [
    {
      value: 'code' as ClaudeModeType,
      icon: Bot,
      label: 'Agent',
      description: '代码模式 - 完整编辑权限',
    },
    {
      value: 'plan' as ClaudeModeType,
      icon: Lightbulb,
      label: 'Plan',
      description: '计划模式 - 只读协作',
    },
    {
      value: 'ask' as ClaudeModeType,
      icon: MessageCircleQuestion,
      label: 'Ask',
      description: '问答模式 - 仅文本回复',
    },
  ];

  // 只在 Claude SDK 引擎下显示
  if (engineType !== 'claude') {
    return null;
  }

  return (
    <Select
      className={styles.select}
      value={currentMode}
      onChange={handleModeChange}
      options={modes.map((mode) => ({
        value: mode.value,
        label: (
          <Flexbox horizontal align="center" gap={6}>
            <Icon icon={mode.icon} size={16} />
            <span>{mode.label}</span>
            {currentMode === mode.value && <Icon icon={Check} size={14} />}
          </Flexbox>
        ),
      }))}
      variant="borderless"
      popupClassName={styles.option}
    />
  );
};

ClaudeModeSwitch.displayName = 'ClaudeModeSwitch';

export default memo(ClaudeModeSwitch);
