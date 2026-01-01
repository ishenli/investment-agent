import { LocalReadFileParams, LocalReadFileResult } from '@/types/localFile';
import { memo } from 'react';

import { useChatStore } from '@renderer/store/chat';
import { chatToolSelectors } from '@renderer/store/chat/slices/builtinTool/selectors';
import { ChatMessagePluginError } from '@/types/message';

import ReadFileSkeleton from './ReadFileSkeleton';
import ReadFileView from './ReadFileView';
import { LocalReadFileState } from '../../type';

interface ReadFileQueryProps {
  args: LocalReadFileParams;
  messageId: string;
  pluginError: ChatMessagePluginError;
  pluginState: LocalReadFileState;
}

const ReadFileQuery = memo<ReadFileQueryProps>(({ args, pluginState, messageId }) => {
  const loading = useChatStore(chatToolSelectors.isSearchingLocalFiles(messageId));

  if (loading) {
    return <ReadFileSkeleton />;
  }

  if (!args?.path || !pluginState) return null;

  return <ReadFileView {...pluginState.fileContent} path={args.path} />;
});

export default ReadFileQuery;
