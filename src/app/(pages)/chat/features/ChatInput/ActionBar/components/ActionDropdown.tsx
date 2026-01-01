'use client';

import { Dropdown, DropdownProps } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import React, { memo } from 'react';

const useStyles = createStyles(({ css, prefixCls }) => ({
  dropdownMenu: css`
    &.${prefixCls}-dropdown-menu {
      .${prefixCls}-dropdown-menu-item-group-list {
        margin: 0;
      }
      .${prefixCls}-avatar {
        margin-inline-end: var(--ant-margin-xs);
      }
    }
  `,
}));

export interface ActionDropdownProps extends DropdownProps {
  maxHeight?: number | string;
  maxWidth?: number | string;
  minWidth?: number | string;
}

const ActionDropdown = memo<ActionDropdownProps>(
  ({ menu, maxHeight, minWidth, maxWidth, children, placement = 'top', ...rest }) => {
    const { cx, styles } = useStyles();

    return (
      <Dropdown
        arrow={false}
        menu={{
          ...menu,
          className: cx(styles.dropdownMenu, menu.className),
          onClick: (e) => {
            e.domEvent.preventDefault();
            menu.onClick?.(e);
          },
          style: {
            maxHeight,
            maxWidth: maxWidth,
            minWidth: minWidth,
            overflowX: 'hidden',
            overflowY: 'scroll',
            width: undefined,
            ...menu.style,
          },
        }}
        placement={placement}
        {...rest}
      >
        {children}
      </Dropdown>
    );
  },
);

export default ActionDropdown;
