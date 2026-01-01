'use client';

import React, { memo } from 'react';

import { useSessionStore } from '@renderer/store/session';

import SessionLayout from '../SessionLayout';
import DefaultMode from './DefaultMode';
import SearchMode from './SearchMode';

const SessionListContent = memo(() => {
  const isSearching = useSessionStore((s) => s.isSearching);

  return <SessionLayout>{isSearching ? <SearchMode /> : <DefaultMode />}</SessionLayout>;
});

SessionListContent.displayName = 'SessionListContent';

export default SessionListContent;
