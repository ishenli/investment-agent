'use client';

import { GuideCard } from '@lobehub/ui';
import { useThemeMode } from 'antd-style';
import React, { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { useFetchTopics } from '@renderer/hooks/useFetchTopics';
import { useChatStore } from '@renderer/store/chat';
import { topicSelectors } from '@renderer/store/chat/selectors';
import { useUserStore } from '@renderer/store/user';
import { preferenceSelectors } from '@renderer/store/user/selectors';
import { TopicDisplayMode } from '@typings/topic';

import TopicConfig from '@renderer/const/text/topicConfig';
import { SkeletonList } from '../SkeletonList';
import ByTimeMode from './ByTimeMode';
import FlatMode from './FlatMode';
import SearchResult from './SearchResult';

const TopicListContent = memo(() => {
  const { isDarkMode } = useThemeMode();
  const [topicsInit, topicLength] = useChatStore((s) => [
    s.topicsInit,
    topicSelectors.currentTopicLength(s),
  ]);
  const [isUndefinedTopics, isInSearchMode] = useChatStore((s) => [
    topicSelectors.isUndefinedTopics(s),
    topicSelectors.isInSearchMode(s),
  ]);

  const [visible, updateGuideState, topicDisplayMode] = useUserStore((s) => [
    s.preference.guide?.topic,
    s.updateGuideState,
    preferenceSelectors.topicDisplayMode(s),
  ]);

  useFetchTopics();

  if (isInSearchMode) return <SearchResult />;

  // first time loading or has no data
  if (!topicsInit || isUndefinedTopics) return <SkeletonList />;

  return (
    <>
      {topicLength === 0 && visible && (
        <Flexbox paddingInline={8}>
          <GuideCard
            alt={TopicConfig.guide.desc}
            cover="https://lobechat.com/images/empty_topic_light.webp"
            coverProps={{
              priority: true,
            }}
            desc={TopicConfig.guide.desc}
            height={120}
            onClose={() => {
              updateGuideState({ topic: false });
            }}
            style={{ flex: 'none', marginBottom: 12, fontSize: 14 }}
            title={TopicConfig.guide.title}
            visible={visible}
            width={200}
          />
        </Flexbox>
      )}
      {topicDisplayMode === TopicDisplayMode.ByTime ? <ByTimeMode /> : <FlatMode />}
    </>
  );
});

TopicListContent.displayName = 'TopicListContent';

export default TopicListContent;
