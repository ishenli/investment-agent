'use client';

import { ActionIcon, Dropdown, Icon, type MenuProps } from '@lobehub/ui';
import { App } from 'antd';
import type { ItemType } from 'antd/es/menu/interface';
import { LucideCheck, MoreHorizontal, Search, Trash } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { Flexbox } from 'react-layout-kit';
import { useTranslation } from 'react-i18next';
import { useTopicTranslation } from '@renderer/hooks/useTopicTranslation';

import SidebarHeader from '@renderer/(pages)/chat/components/SidebarHeader';
import { useChatStore } from '@renderer/store/chat';
import { topicSelectors } from '@renderer/store/chat/selectors';
import { useUserStore } from '@renderer/store/user';
import { preferenceSelectors } from '@renderer/store/user/selectors';
import { TopicDisplayMode } from '@typings/topic';

import React from 'react';
import TopicSearchBar from './TopicSearchBar';

const Header = memo(() => {
  const { t } = useTranslation('common');
  const topicTranslation = useTopicTranslation();
  const [topicLength, removeUnstarredTopic, removeAllTopic] = useChatStore((s) => [
    topicSelectors.currentTopicLength(s),
    s.removeUnstarredTopic,
    s.removeSessionTopics,
  ]);
  const [topicDisplayMode, updatePreference] = useUserStore((s) => [
    preferenceSelectors.topicDisplayMode(s),
    s.updatePreference,
  ]);
  const [showSearch, setShowSearch] = useState(false);
  const { modal } = App.useApp();

  const items = useMemo<MenuProps['items']>(
    () => [
      ...(Object.values(TopicDisplayMode).map((mode) => ({
        icon: topicDisplayMode === mode ? <Icon icon={LucideCheck} /> : <div />,
        key: mode,
        label: topicTranslation.groupMode[mode as keyof typeof topicTranslation.groupMode],
        onClick: () => {
          updatePreference({ topicDisplayMode: mode });
        },
      })) as ItemType[]),
      {
        type: 'divider',
      },
      {
        icon: <Icon icon={Trash} />,
        key: 'deleteUnstarred',
        label: topicTranslation.removeUnstarred,
        onClick: () => {
          modal.confirm({
            cancelText: t('cancel'),
            centered: true,
            okButtonProps: { danger: true },
            okText: t('confirm'),
            onOk: removeUnstarredTopic,
            title: topicTranslation.confirmRemoveUnstarred,
          });
        },
      },
      {
        danger: true,
        icon: <Icon icon={Trash} />,
        key: 'deleteAll',
        label: topicTranslation.removeAll,
        onClick: () => {
          modal.confirm({
            cancelText: t('cancel'),
            centered: true,
            okButtonProps: { danger: true },
            okText: t('confirm'),
            onOk: removeAllTopic,
            title: topicTranslation.confirmRemoveAll,
          });
        },
      },
    ],
    [topicDisplayMode, topicTranslation, updatePreference, removeUnstarredTopic, removeAllTopic, modal, t],
  );

  return showSearch ? (
    <Flexbox padding={'12px 16px 4px'}>
      <TopicSearchBar onClear={() => setShowSearch(false)} />
    </Flexbox>
  ) : (
    <SidebarHeader
      actions={
        <>
          <ActionIcon icon={Search} onClick={() => setShowSearch(true)} size={'small'} />
          <Dropdown
            arrow={false}
            menu={{
              items: items,
              onClick: ({ domEvent }) => {
                domEvent.stopPropagation();
              },
            }}
            trigger={['click']}
          >
            <ActionIcon icon={MoreHorizontal} size={'small'} />
          </Dropdown>
        </>
      }
      title={`${topicTranslation.title} ${topicLength > 1 ? topicLength + 1 : ''}`}
    />
  );
});

export default Header;
