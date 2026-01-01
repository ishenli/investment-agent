import dayjs from 'dayjs';
import React, { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { GroupedTopic } from '@typings/topic';

const preformat = (id: string) =>
  id.startsWith('20') ? (id.includes('-') ? dayjs(id).format('MMMM') : id) : undefined;

const messageConfig = {
  groupTitle: {
    byTime: {
      month: '本月',
      today: '今天',
      week: '本周',
      yesterday: '昨天',
    },
  },
};

const TopicGroupItem = memo<Omit<GroupedTopic, 'children'>>(({ id, title }) => {
  const timeTitle =
    preformat(id) ??
    messageConfig.groupTitle.byTime[id as keyof typeof messageConfig.groupTitle.byTime];

  return (
    <Flexbox paddingBlock={'12px 8px'} paddingInline={12}>
      {title ? title : timeTitle}
    </Flexbox>
  );
});
export default TopicGroupItem;
