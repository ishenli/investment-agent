'use client';

import { createStyles } from 'antd-style';
import React, { memo } from 'react';
import { Flexbox } from 'react-layout-kit';
import TogglePanelButton from './TogglePanelButton';
import { SidebarTrigger } from '@renderer/components/ui/sidebar';

export const useStyles = createStyles(({ css, token }) => ({
  logo: css`
    color: ${token.colorText};
    fill: ${token.colorText};
  `,
  top: css`
    position: sticky;
    inset-block-start: 0;
    padding-block-start: 10px;
  `,
}));

const Header = memo(() => {
  const { styles } = useStyles();
  const isValidating = false;

  return (
    <Flexbox className={styles.top} gap={16} paddingInline={8}>
      <Flexbox align={'flex-start'} horizontal justify={'space-between'}>
        <Flexbox
          align={'center'}
          gap={4}
          horizontal
          style={{
            paddingInlineStart: 4,
            paddingTop: 2,
          }}
        >
          <SidebarTrigger className="-ml-1" />
        </Flexbox>
        <Flexbox align={'center'} gap={4} horizontal>
          <TogglePanelButton />
        </Flexbox>
      </Flexbox>
      {/* <SessionSearchBar /> */}
    </Flexbox>
  );
});

export default Header;
