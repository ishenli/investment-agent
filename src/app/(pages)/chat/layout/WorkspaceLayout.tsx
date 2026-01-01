'use client';
import React, { PropsWithChildren, memo } from 'react';
import { Flexbox } from 'react-layout-kit';

const WorkspaceLayout = memo<PropsWithChildren>(({ children }) => {
  return (
    <Flexbox
      flex={1}
      style={{
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {children}
    </Flexbox>
  );
});

export default WorkspaceLayout;
