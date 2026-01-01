'use client';

import { Popover, PopoverProps } from 'antd';
import { createStyles } from 'antd-style';
import { ReactNode, memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import UpdateLoading from '@renderer/(pages)/chat/components/Loading/UpdateLoading';
import React from 'react';

const useStyles = createStyles(({ css, prefixCls }) => ({
  popoverContent: css`
    .${prefixCls}-form {
      .${prefixCls}-form-item:first-child {
        padding-block: 0 4px;
      }
      .${prefixCls}-form-item:last-child {
        padding-block: 4px 0;
      }
    }
  `,
}));

export interface ActionPopoverProps extends Omit<PopoverProps, 'title' | 'content'> {
  content?: ReactNode;
  extra?: ReactNode;
  loading?: boolean;
  maxHeight?: number | string;
  maxWidth?: number | string;
  minWidth?: number | string;
  title?: ReactNode;
}

const ActionPopover = memo<ActionPopoverProps>(
  ({
    styles: customStyles,
    maxHeight,
    maxWidth,
    minWidth,
    children,
    classNames,
    title,
    placement,
    loading,
    extra,
    ...rest
  }) => {
    const { cx, styles, theme } = useStyles();
    return (
      <Popover
        arrow={false}
        classNames={{
          ...classNames,
          body: cx(styles.popoverContent, classNames?.body),
        }}
        placement={placement}
        styles={{
          ...customStyles,
          body: {
            maxHeight,
            maxWidth: maxWidth,
            minWidth: minWidth,
            width: '100vw',
            ...customStyles?.body,
          },
        }}
        title={
          title && (
            <Flexbox gap={8} horizontal justify={'space-between'} style={{ marginBottom: 16 }}>
              {title}
              {extra}
              {loading && <UpdateLoading style={{ color: theme.colorTextSecondary }} />}
            </Flexbox>
          )
        }
        {...rest}
      >
        {children}
      </Popover>
    );
  },
);

export default ActionPopover;
