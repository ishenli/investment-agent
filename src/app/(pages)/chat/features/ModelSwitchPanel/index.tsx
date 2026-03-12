import { ModelItemRender, ProviderItemRender } from '@renderer/(pages)/chat/components/ModelSelect';
import ActionDropdown from '@renderer/(pages)/chat/features/ChatInput/ActionBar/components/ActionDropdown';
import { useSessionStore } from '@renderer/store/session';
import { sessionSelectors } from '@renderer/store/session';
import { useAiInfraStore } from '@renderer/store/aiInfra';
import { EnabledProviderWithModels } from '@typings/aiProvider';
import { isEqual } from 'lodash';
import { Icon } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import type { ItemType } from 'antd/es/menu/interface';
import { LucideArrowRight } from 'lucide-react';
import React, { type ReactNode, memo, useMemo } from 'react';
import { Flexbox } from 'react-layout-kit';
import { useRouter } from 'next/navigation';

const useStyles = createStyles(({ css, prefixCls }) => ({
  menu: css`
    .${prefixCls}-dropdown-menu-item {
      display: flex;
      gap: 8px;
    }
    .${prefixCls}-dropdown-menu {
      &-item-group-title {
        padding-inline: 8px;
      }

      &-item-group-list {
        margin: 0 !important;
      }
    }
  `,
  tag: css`
    cursor: pointer;
  `,
}));

const menuKey = (provider: string, model: string) => `${provider}-${model}`;

interface IProps {
  children?: ReactNode;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  updating?: boolean;
}

const ModelSwitchPanel = memo<IProps>(({ children, onOpenChange, open }) => {
  const router = useRouter();
  const { styles, theme } = useStyles();
  const updateAgentConfig = useSessionStore((s) => s.updateAgentConfig);

  // 从 SessionStore 读取当前会话的 model 和 provider
  const currentSession = useSessionStore(sessionSelectors.currentSession);
  const model = currentSession?.config?.model || '';
  const provider = currentSession?.config?.provider || '';

  const enabledList = useAiInfraStore((s) => s.enabledChatModelList, isEqual);

  const items = useMemo<ItemType[]>(() => {
    const getModelItems = (providerItem: EnabledProviderWithModels) => {
      const items = providerItem.children.map((item) => ({
        key: menuKey(providerItem.id, item.id),
        label: <ModelItemRender {...item} {...item.abilities} />,
        onClick: async () => {
          await updateAgentConfig({ model: item.id, provider: providerItem.id });
        },
      }));

      // if there is empty items, add a placeholder guide
      if (items.length === 0)
        return [
          {
            key: `${providerItem.id}-empty`,
            label: (
              <Flexbox gap={8} horizontal style={{ color: theme.colorTextTertiary }}>
                {'ModelSwitchPanel.emptyModel'}
                <Icon icon={LucideArrowRight} />
              </Flexbox>
            ),
            onClick: () => {
              router.push('/setting/provider');
            },
          },
        ];

      return items;
    };

    if (!enabledList || enabledList.length === 0) {
      return [
        {
          key: `no-provider`,
          label: (
            <Flexbox gap={8} horizontal style={{ color: theme.colorTextTertiary }}>
              {'ModelSwitchPanel.emptyProvider'}
              <Icon icon={LucideArrowRight} />
            </Flexbox>
          ),
          onClick: () => {
            router.push('/setting/provider');
          },
        },
      ];
    }
    // otherwise show with provider group
    return enabledList.map((providerItem) => ({
      children: getModelItems(providerItem),
      key: providerItem.id,
      label: (
        <Flexbox horizontal justify="space-between">
          <ProviderItemRender
            logo={providerItem.logo}
            name={providerItem.name}
            provider={providerItem.id}
            source={providerItem.source}
          />
        </Flexbox>
      ),
      type: 'group',
    }));
  }, [enabledList, updateAgentConfig, router, theme]);

  const icon = <div className={styles.tag}>{children}</div>;

  return (
    <ActionDropdown
      menu={{
        // @ts-expect-error 等待 antd 修复
        activeKey: menuKey(provider, model),
        className: styles.menu,
        items,
        // 不加限高就会导致面板超长，顶部的内容会被隐藏
        // https://github.com/user-attachments/assets/9c043c47-42c5-46ef-b5c1-bee89376f042
        style: {
          maxHeight: 550,
          overflowY: 'scroll',
        },
      }}
      onOpenChange={onOpenChange}
      open={open}
      placement={'topLeft'}
    >
      {icon}
    </ActionDropdown>
  );
});

export default ModelSwitchPanel;