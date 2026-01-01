import PanelBody from '@renderer/(pages)/chat/components/PanelBody';
import React, { PropsWithChildren } from 'react';
import Header from './SessionHeader';

const DesktopLayout = ({ children }: PropsWithChildren) => {
  return (
    <>
      <Header />
      <PanelBody>{children}</PanelBody>
    </>
  );
};

export default DesktopLayout;
