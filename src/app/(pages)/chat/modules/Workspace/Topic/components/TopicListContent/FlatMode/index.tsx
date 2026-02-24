'use client';

import isEqual from 'fast-deep-equal';
import React, { memo, useCallback, useMemo, useRef } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';

import { useChatStore } from '@renderer/store/chat';
import { topicSelectors } from '@renderer/store/chat/selectors';
import { ChatTopic } from '@typings/topic';

import TopicItem from '../TopicItem';
import { useTranslation } from 'react-i18next';

const FlatMode = memo(() => {
  const { t } = useTranslation('topic');
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [activeTopicId] = useChatStore((s) => [s.activeTopicId]);
  const activeTopicList = useChatStore(topicSelectors.displayTopics, isEqual);

  const topics = useMemo(
    () => [
      {
        favorite: false,
        id: 'default',
        title: t('defaultTitle'),
      } as ChatTopic,
      ...(activeTopicList || []),
    ],
    [activeTopicList, t],
  );

  const itemContent = useCallback(
    (index: number, { id, favorite, title }: ChatTopic) =>
      index === 0 ? (
        <TopicItem active={!activeTopicId} fav={favorite} title={title} />
      ) : (
        <TopicItem active={activeTopicId === id} fav={favorite} id={id} key={id} title={title} />
      ),
    [activeTopicId],
  );

  const activeIndex = topics.findIndex((topic) => topic.id === activeTopicId);

  return (
    <Virtuoso
      // components={{ ScrollSeekPlaceholder: Placeholder }}
      computeItemKey={(_, item) => item.id}
      data={topics}
      defaultItemHeight={44}
      initialTopMostItemIndex={Math.max(activeIndex, 0)}
      itemContent={itemContent}
      overscan={44 * 10}
      ref={virtuosoRef}
      // scrollSeekConfiguration={{
      //   enter: (velocity) => Math.abs(velocity) > 350,
      //   exit: (velocity) => Math.abs(velocity) < 10,
      // }}
    />
  );
});

FlatMode.displayName = 'FlatMode';

export default FlatMode;
