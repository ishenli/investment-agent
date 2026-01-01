import { Skeleton } from 'antd';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { useChatStore } from '@renderer/store/chat';
import { chatToolSelectors } from '@renderer/store/chat/selectors';
import FileItem from '@renderer/tools/local-system/components/FileItem';
import { ChatMessagePluginError } from '@/types/message';
import { LocalFileItem } from '@/types/localFile';

interface SearchFilesProps {
  listResults?: LocalFileItem[];
  messageId: string;
  pluginError: ChatMessagePluginError;
}

const SearchFiles = memo<SearchFilesProps>(({ listResults = [], messageId }) => {
  const loading = useChatStore(chatToolSelectors.isSearchingLocalFiles(messageId));

  if (loading) {
    return (
      <Flexbox gap={4}>
        <Skeleton.Button active block style={{ height: 16 }} />
        <Skeleton.Button active block style={{ height: 16 }} />
        <Skeleton.Button active block style={{ height: 16 }} />
        <Skeleton.Button active block style={{ height: 16 }} />
      </Flexbox>
    );
  }

  return (
    <Flexbox gap={2} style={{ maxHeight: 140, overflow: 'scroll' }}>
      {listResults.map((item) => (
        <FileItem key={item.path} {...item} showTime />
      ))}
    </Flexbox>
  );
});

SearchFiles.displayName = 'SearchFiles';

export default SearchFiles;
