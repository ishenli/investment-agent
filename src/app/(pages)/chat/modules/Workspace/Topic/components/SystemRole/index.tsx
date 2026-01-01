'use client';

import { memo } from 'react';

import { useSessionStore } from '@renderer/store/session';
import { sessionSelectors } from '@renderer/store/session/selectors';

import React from 'react';
import SystemRoleContent from './SystemRoleContent';

const SystemRole = memo(() => {
  const { isAgentEditable: showSystemRole } = {
    isAgentEditable: false,
  };
  const isInbox = useSessionStore(sessionSelectors.isInboxSession);

  return showSystemRole && !isInbox && <SystemRoleContent />;
});

export default SystemRole;
