import { Skeleton } from 'antd';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { useChatStore } from '@/app/store/chat';
import { chatSelectors } from '@/app/store/chat/selectors';
import FileItem from '@/app/tools/local-system/components/FileItem';
import { FileResult } from '@/app/tools/local-system/type';
import { ChatMessagePluginError } from '@/types/message';

interface SearchFilesProps {
  messageId: string;
  pluginError: ChatMessagePluginError;
  searchResults?: FileResult[];
}

const SearchFiles = memo<SearchFilesProps>(({ searchResults = [], messageId }) => {
  const loading = useChatStore((s) => s.localFileLoading?.[messageId] || false);

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
    <Flexbox gap={2} style={{ maxHeight: 260, overflow: 'scroll' }}>
      {searchResults.map((item) => (
        <FileItem key={item.path} {...item} />
      ))}
    </Flexbox>
  );
});

SearchFiles.displayName = 'SearchFiles';

export default SearchFiles;
