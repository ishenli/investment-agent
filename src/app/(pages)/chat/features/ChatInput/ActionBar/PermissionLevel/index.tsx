import { createStyles } from 'antd-style';
import { Select, Icon } from '@lobehub/ui';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';
import { ShieldCheck, Shield, ShieldAlert, ShieldOff, Check } from 'lucide-react';

import { useSessionStore } from '@renderer/store/session';
import { sessionSelectors } from '@renderer/store/session/selectors';
import type { EngineType, PermissionLevelType } from '@typings/agent';

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

const PermissionLevelSwitch = () => {
  const { styles } = useStyles();

  const engineType = useSessionStore((s) => {
    const session = sessionSelectors.currentSession(s);
    return session?.config?.engineType || 'deepagents';
  });

  const currentLevel = useSessionStore(sessionSelectors.currentSessionPermissionLevel);

  const updateAgentConfig = useSessionStore((s) => s.updateAgentConfig);

  const handleLevelChange = async (value: PermissionLevelType) => {
    const sessionId = useSessionStore.getState().activeId;
    if (sessionId) {
      await updateAgentConfig({ permissionLevel: value });
    }
  };

  const levels: {
    value: PermissionLevelType;
    icon: typeof Shield;
    label: string;
    description: string;
    color: string;
  }[] = [
    {
      value: 'safe',
      icon: ShieldCheck,
      label: 'Safe',
      description: '安全模式 — 禁止系统/金融操作',
      color: '#52c41a',
    },
    {
      value: 'standard',
      icon: Shield,
      label: 'Standard',
      description: '标准模式 — 系统/金融需确认',
      color: '#1890ff',
    },
    {
      value: 'power',
      icon: ShieldAlert,
      label: 'Power',
      description: '高级模式 — 金融自动，系统需确认',
      color: '#faad14',
    },
    {
      value: 'unrestricted',
      icon: ShieldOff,
      label: 'Unrestricted',
      description: '无限制 — 所有操作自动执行',
      color: '#ff4d4f',
    },
  ];

  // 只在 Hermes 引擎下显示
  if (engineType !== 'hermes') {
    return null;
  }

  return (
    <Select
      className={styles.select}
      value={currentLevel}
      onChange={handleLevelChange}
      options={levels.map((level) => ({
        value: level.value,
        label: (
          <Flexbox horizontal align="center" gap={6}>
            <Icon icon={level.icon} size={16} style={{ color: level.color }} />
            <span>{level.label}</span>
            {currentLevel === level.value && <Icon icon={Check} size={14} />}
          </Flexbox>
        ),
      }))}
      variant="borderless"
      popupClassName={styles.option}
    />
  );
};

PermissionLevelSwitch.displayName = 'PermissionLevelSwitch';

export default memo(PermissionLevelSwitch);
