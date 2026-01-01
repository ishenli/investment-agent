import { Icon } from '@lobehub/ui';
import { Skeleton } from 'antd';
import { ChevronRight } from 'lucide-react';
import path from 'path-browserify-esm';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { ChatMessagePluginError } from '@/types/message';

interface WriteLocalFileParams {
  content: string;
  path: string;
}

interface WriteFileProps {
  args: WriteLocalFileParams;
  messageId: string;
  pluginError: ChatMessagePluginError;
}

const WriteFile = memo<WriteFileProps>(({ args }) => {
  if (!args) return <Skeleton active />;

  const { base, dir } = path.parse(args.path);

  return (
    <Flexbox horizontal>
      <div>{dir}</div>
      <Icon icon={ChevronRight} />
      <div>{base}</div>
    </Flexbox>
  );
});

export default WriteFile;
