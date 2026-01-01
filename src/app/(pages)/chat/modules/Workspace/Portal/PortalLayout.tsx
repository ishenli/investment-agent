import { PropsWithChildren } from 'react';

import { PortalHeader } from '../../../features/Portal/router';

import Body from './Body';

const Layout = ({ children }: PropsWithChildren) => {
  return (
    <>
      <PortalHeader />
      <Body>{children}</Body>
    </>
  );
};

export default Layout;
