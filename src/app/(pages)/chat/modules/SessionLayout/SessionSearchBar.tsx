'use client';

import { SearchBar } from '@lobehub/ui';
import { type ChangeEvent, memo, useCallback } from 'react';

import { useSessionStore } from '@renderer/store/session';
import React from 'react';

const SessionSearchBar = memo<{ mobile?: boolean }>(({ mobile }) => {
  const [keywords, useSearchSessions, updateSearchKeywords] = useSessionStore((s) => [
    s.sessionSearchKeywords,
    s.useSearchSessions,
    s.updateSearchKeywords,
  ]);

  const { isValidating } = useSearchSessions(keywords);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      updateSearchKeywords(e.target.value);
    },
    [updateSearchKeywords],
  );

  return (
    <SearchBar
      allowClear
      enableShortKey={!mobile}
      loading={isValidating}
      onChange={handleChange}
      placeholder={'searchAgentPlaceholder'}
      spotlight={!mobile}
      value={keywords}
      variant={'filled'}
    />
  );
});

export default SessionSearchBar;
