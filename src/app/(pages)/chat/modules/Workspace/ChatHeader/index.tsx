import { ChatHeader } from '@lobehub/ui/chat';
import React from 'react';
import HeaderAction from './HeaderAction';
import Main from './Main';


const Header = () => {
  return (
    <ChatHeader
      left={<Main />}
      right={<HeaderAction />}
      style={{
        paddingInline: 8,
        position: 'initial',
        zIndex: 11,
        backgroundColor: 'var(--antd-bg-color-container)',
        // @ts-expect-error - WebkitAppRegion is not a standard CSS property
        WebkitAppRegion: 'drag',
        appRegion: 'drag',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    />
  );
};

export default Header;
