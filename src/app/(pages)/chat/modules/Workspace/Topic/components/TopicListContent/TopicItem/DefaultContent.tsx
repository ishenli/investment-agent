import TopicConfig from '@renderer/const/text/topicConfig';
import { Icon, Tag, Text } from '@lobehub/ui';
import { useTheme } from 'antd-style';
import { MessageSquareDashed } from 'lucide-react';
import React, { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

const DefaultContent = memo(() => {
  const theme = useTheme();

  return (
    <Flexbox align={'center'} gap={8} horizontal data-aspm="c437892">
      <Flexbox align={'center'} height={24} justify={'center'} width={24}>
        <Icon color={theme.colorTextDescription} icon={MessageSquareDashed} />
      </Flexbox>
      <Text ellipsis={{ rows: 1 }} style={{ margin: 0 }} data-aspm-click="d627173">
        {TopicConfig.defaultTitle}
      </Text>
      <Tag>{TopicConfig.temp}</Tag>
    </Flexbox>
  );
});

export default DefaultContent;
