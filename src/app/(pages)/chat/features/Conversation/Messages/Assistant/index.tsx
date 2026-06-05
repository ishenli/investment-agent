import { ReactNode, memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { LOADING_FLAT } from '@renderer/const/message';
import { useChatStore } from '@renderer/store/chat';
import { aiChatSelectors, chatSelectors } from '@renderer/store/chat/selectors';
import { ChatMessage } from '@typings/message';

import React from 'react';
import AgentEvents from '@renderer/(pages)/chat/components/AgentEvents';
import { GenerativeUIRenderer } from '@renderer/(pages)/chat/features/Conversation/components/GenerativeUI';
import { DefaultMessage } from '../Default';
import IntentUnderstanding from './IntentUnderstanding';
import Reasoning from './Reasoning';
import PermissionRequestCard from './PermissionRequestCard';

export const AssistantMessage = memo<
  ChatMessage & {
    editableContent: ReactNode;
  }
>(({ id, tools, content, chunksList, search, imageList, permissionRequest, agentEvents, uiArtifacts, ...props }) => {
  const editing = useChatStore(chatSelectors.isMessageEditing(id));
  const generating = useChatStore(chatSelectors.isMessageGenerating(id));

  const isToolCallGenerating = generating && (content === LOADING_FLAT || !content) && !!tools;

  const isReasoning = useChatStore(aiChatSelectors.isMessageInReasoning(id));

  const isIntentUnderstanding = useChatStore(aiChatSelectors.isIntentUnderstanding(id));

  const showImageItems = !!imageList && imageList.length > 0;

  // remove \n to avoid empty content
  // refs: https://github.com/lobehub/lobe-chat/pull/6153
  const showReasoning =
    (!!props.reasoning && props.reasoning.content?.trim() !== '') ||
    (!props.reasoning && isReasoning);

  const showAgentEvents = !!agentEvents && agentEvents.length > 0;

  const artifactToolCount = agentEvents
    ? agentEvents.filter(
        (e) => e.eventType === 'tool_use' && e.toolName === 'create_ui_artifact',
      ).length
    : 0;
  const pendingArtifactCount = Math.max(0, artifactToolCount - (uiArtifacts?.length ?? 0));
  const hasArtifacts =
    (uiArtifacts && uiArtifacts.length > 0) || (generating && pendingArtifactCount > 0);

  return editing ? (
    <DefaultMessage
      content={content}
      id={id}
      isToolCallGenerating={isToolCallGenerating}
      {...props}
    />
  ) : (
    <Flexbox gap={8} id={id}>
      {showAgentEvents && (
        <AgentEvents events={agentEvents} running={generating} />
      )}
      {showReasoning && <Reasoning {...props.reasoning} id={id} />}
      {isIntentUnderstanding ? (
        <IntentUnderstanding />
      ) : (
        content && (
          <DefaultMessage
            addIdOnDOM={false}
            content={content}
            id={id}
            isToolCallGenerating={isToolCallGenerating}
            {...props}
          />
        )
      )}
      {hasArtifacts && (
        <GenerativeUIRenderer
          artifacts={uiArtifacts}
          generating={generating}
          pendingCount={pendingArtifactCount}
        />
      )}
      {permissionRequest && <PermissionRequestCard data={permissionRequest} />}
    </Flexbox>
  );
});
