import { useAgentStore } from '@renderer/store/agent';
import { agentSelectors } from '@renderer/store/agent/selectors';
import { useChatStore } from '@renderer/store/chat';
import { chatSelectors, topicSelectors } from '@renderer/store/chat/selectors';
import { Button, message } from 'antd';
import isEqual from 'fast-deep-equal';
import React from 'react';

export default function ShareLink() {
  const messages = useChatStore(chatSelectors.activeBaseChats, isEqual);
  const topic = useChatStore(topicSelectors.currentActiveTopic, isEqual);
  const [model] = useAgentStore((s) => [
    agentSelectors.currentAgentModel(s),
    agentSelectors.currentAgentPlugins(s),
  ]);
  const handleShare = async () => {
    if (messages.length === 0) {
      message.warning('当前没有对话内容可分享');
      return;
    }

    try {
      const shareData = {
        title: topic?.title || '',
        messages: messages.map((message) => ({
          id: message.id,
          messageContent: [
            {
              type: 'TEXT',
              text: message.content,
              index: 0,
            },
          ],
          answerStatus: 'MESSAGE_END' as const,
          type: message.role === 'user' ? 'QUERY' : ('AI' as any),
          toolCalls: [],
          contentItems: [],
        })),
        model: model,
        createdAt: new Date().toLocaleDateString(),
        promptSettings: '',
        toolsConfig: {
          availableTools: [],
        },
        version: '1.0',
      };

      // const shareUrl = await generateShortShareUrl(shareData);
      // console.warn('shareUrl', shareUrl);
      // if (shareUrl) {
      //   await navigator.clipboard.writeText(shareUrl);
      //   message.success('分享链接已复制到剪贴板');
      // } else {
      //   message.error('生成分享链接失败');
      // }
    } catch (error) {
      console.error('分享失败:', error);
      message.error('分享失败，请重试');
    }
  };
  return (
    <div>
      直接通过公开链接的内容访问对话记录。
      <br />
      <br />
      <Button onClick={handleShare}>复制链接</Button>
    </div>
  );
}
