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
        backgroundColor: '#fbfbfb',
      }}
    />
  );
};

export default Header;
