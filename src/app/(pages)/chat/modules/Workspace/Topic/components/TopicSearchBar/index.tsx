'use client';

import { SearchBar } from '@lobehub/ui';
import { useUnmount } from 'ahooks';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useChatStore } from '@renderer/store/chat';
import React from 'react';

const TopicSearchBar = memo<{ onClear?: () => void }>(({ onClear }) => {
  const { t } = useTranslation('topic');

  const [tempValue, setTempValue] = useState('');
  const [searchKeyword, setSearchKeywords] = useState('');
  const mobile = false;
  const [activeSessionId, useSearchTopics] = useChatStore((s) => [s.activeId, s.useSearchTopics]);

  useSearchTopics(searchKeyword, activeSessionId);

  useUnmount(() => {
    useChatStore.setState({ inSearchingMode: false, isSearchingTopic: false });
  });

  const startSearchTopic = () => {
    if (tempValue === searchKeyword) return;

    setSearchKeywords(tempValue);
    useChatStore.setState({
      inSearchingMode: !!tempValue,
      isSearchingTopic: !!tempValue,
    });
  };

  return (
    <SearchBar
      autoFocus
      onBlur={() => {
        if (tempValue === '') {
          onClear?.();

          return;
        }

        startSearchTopic();
      }}
      onChange={(e) => {
        setTempValue(e.target.value);
      }}
      onPressEnter={startSearchTopic}
      placeholder="搜索话题..."
      spotlight={!mobile}
      value={tempValue}
      variant={'filled'}
    />
  );
});

export default TopicSearchBar;
