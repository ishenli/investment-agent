'use client';

import { ChatMessage } from '@typings/message';
import { get } from 'lodash';
import { createStyles } from 'antd-style';
import React, { memo } from 'react';

const useStyles = createStyles(({ css }) => ({
  container: css`
    padding-block: 8px;
    padding-inline: 8px;
    border-radius: 8px;
    background: #fff;
    border: 1px solid #f4f4f4;
    margin-bottom: 4px;
  `,

  title: css`
    display: flex;
    gap: 2px;
    margin: 0;
    align-items: center;
  `,
  img: css`
    width: 20px;
    height: 20px;
  `,
}));

export const thinkImg = {
  TOOL: 'https://mdn.alipayobjects.com/huamei_35zehm/afts/img/A*yRWIS51p-Q0AAAAAAAAAAAAADjCDAQ/original', // 工具
  THOUGHT:
    'https://mdn.alipayobjects.com/huamei_35zehm/afts/img/A*nZDDTbsUkA4AAAAAAAAAAAAADjCDAQ/original',
  KNOWLEDGE:
    'https://mdn.alipayobjects.com/huamei_35zehm/afts/img/A*nZDDTbsUkA4AAAAAAAAAAAAADjCDAQ/original',
  MCP: 'https://mdn.alipayobjects.com/huamei_35zehm/afts/img/A*EYi7SpEZPpUAAAAAAAAAAAAADjCDAQ/original', // 处理
  END: 'https://mdn.alipayobjects.com/huamei_35zehm/afts/img/A*6TlqTYb3RNoAAAAAAAAAAAAADjCDAQ/original',
};

const ThoughtBelowMessage = memo<ChatMessage>(({ thoughtChain }) => {
  const { styles } = useStyles();

  if (!thoughtChain) return null;

  const img = thinkImg[thoughtChain.type] || thinkImg.END;
  let title = thoughtChain.title;

  // 如果有工具，则显示工具名称
  if (thoughtChain.type === 'TOOL' && get(thoughtChain, 'content.name')) {
    title = get(thoughtChain, 'content.name') + ' ' + title;
  }
  return (
    <div className={styles.container}>
      <p className={styles.title}>
        <img className={styles.img} src={img} alt="think" />
        &nbsp;{title}
      </p>
    </div>
  );
});

export default ThoughtBelowMessage;
