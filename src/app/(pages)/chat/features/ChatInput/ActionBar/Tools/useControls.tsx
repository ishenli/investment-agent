import { Avatar, ItemType } from '@lobehub/ui';
import isEqual from 'fast-deep-equal';
import { useTranslation } from 'react-i18next';

import { useCheckPluginsIsInstalled } from '@renderer/hooks/useCheckPluginsIsInstalled';
import { useFetchInstalledPlugins } from '@renderer/hooks/useFetchInstalledPlugins';
import { useAgentStore } from '@renderer/store/agent';
import { useSessionStore } from '@renderer/store/session';
import { sessionSelectors } from '@renderer/store/session/selectors';
import { useToolStore } from '@renderer/store/tool';
import { builtinToolSelectors } from '@renderer/store/tool/selectors';

import ToolItem from './ToolItem';

export const useControls = ({ setUpdating }: { setUpdating: (updating: boolean) => void }) => {
  const { t } = useTranslation('chat');
  const { showDalle } = { showDalle: false };

  // 从 SessionStore 读取 plugins，从 AgentStore 读取 togglePlugin
  const checked = useSessionStore(sessionSelectors.currentSessionPlugins);
  const togglePlugin = useAgentStore((s) => s.togglePlugin);
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
          <ToolItem
            checked={checked.includes(item.identifier)}
            id={item.identifier}
            label={item.meta?.title}
            onUpdate={async () => {
              setUpdating(true);
              await togglePlugin(item.identifier);
              setUpdating(false);
            }}
          />
        ),
      })),

      key: 'builtins',
      label: t('tools.plugins.groupName'),
      type: 'group',
    },
    // {
    //   children: list.map((item) => ({
    //     icon: item?.avatar ? (
    //       <PluginAvatar avatar={item.avatar} size={20} />
    //     ) : (
    //       <Icon icon={ToyBrick} size={20} />
    //     ),
    //     key: item.identifier,
    //     label: (
    //       <ToolItem
    //         checked={checked.includes(item.identifier)}
    //         id={item.identifier}
    //         label={item.title}
    //         onUpdate={async () => {
    //           setUpdating(true);
    //           await togglePlugin(item.identifier);
    //           setUpdating(false);
    //         }}
    //       />
    //     ),
    //   })),
    //   key: 'plugins',
    //   label: (
    //     <Flexbox align={'center'} gap={40} horizontal justify={'space-between'}>
    //       {t('tools.plugins.groupName')}
    //       {enablePluginCount === 0 ? null : (
    //         <div style={{ fontSize: 12, marginInlineEnd: 4 }}>
    //           {t('tools.plugins.enabled', { num: enablePluginCount })}
    //         </div>
    //       )}
    //     </Flexbox>
    //   ),
    //   type: 'group',
    // },
    // {
    //   type: 'divider',
    // },
    // {
    //   extra: <Icon icon={ArrowRight} />,
    //   icon: Store,
    //   key: 'plugin-store',
    //   label: t('tools.plugins.store'),
    //   onClick: () => {
    //     setModalOpen(true);
    //   },
    // },
  ];

  return items;
};