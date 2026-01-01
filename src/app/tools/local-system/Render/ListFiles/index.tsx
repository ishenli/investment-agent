import React, { memo } from 'react';

import { LocalFolder } from '@chat/features/LocalFile';
import { ChatMessagePluginError } from '@/types/message';

import SearchResult from './Result';
import { ListLocalFileParams } from '@/types/localFile';
import { LocalFileListState } from '../../type';

interface ListFilesProps {
  args: ListLocalFileParams;
  messageId: string;
  pluginError: ChatMessagePluginError;
  pluginState?: LocalFileListState;
}

const ListFiles = memo<ListFilesProps>(({ messageId, pluginError, args, pluginState }) => {
  return (
    <>
      <LocalFolder path={args.path} />
      <SearchResult
        listResults={pluginState?.listResults}
        messageId={messageId}
        pluginError={pluginError}
      />
    </>
  );
});

ListFiles.displayName = 'ListFiles';

export default ListFiles;
