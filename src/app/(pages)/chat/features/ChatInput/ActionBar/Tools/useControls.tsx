import { Avatar, Icon, ItemType } from '@lobehub/ui';
import isEqual from 'fast-deep-equal';
import { ArrowRight, Store, ToyBrick } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import PluginAvatar from '../../../../components/Plugins/PluginAvatar';
import { useCheckPluginsIsInstalled } from '@renderer/hooks/useCheckPluginsIsInstalled';
import { useFetchInstalledPlugins } from '@renderer/hooks/useFetchInstalledPlugins';
import { useAgentStore } from '@renderer/store/agent';
import { agentSelectors } from '@renderer/store/agent/selectors';
import { useToolStore } from '@renderer/store/tool';
import { builtinToolSelectors, pluginSelectors } from '@renderer/store/tool/selectors';

import ToolItem from './ToolItem';

export const useControls = ({
  setUpdating,
}: {
  setUpdating: (updating: boolean) => void;
}) => {
  const { showDalle } = { showDalle: false };
  const [checked, togglePlugin] = useAgentStore((s) => [
    agentSelectors.currentAgentPlugins(s),
    s.togglePlugin,
  ]);
  const builtinList = useToolStore(builtinToolSelectors.metaList(showDalle), isEqual);
  const plugins = useAgentStore((s) => agentSelectors.currentAgentPlugins(s));

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
      label: '内置插件',
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
