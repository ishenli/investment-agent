import { useChatStore } from '@renderer/store/chat';
import { useGlobalStore } from '@renderer/store/global';
import { systemStatusSelectors } from '@renderer/store/global/selectors';
import { useSessionStore } from '@renderer/store/session';
import { chatSelectors } from '@renderer/store/chat/selectors';

export const useFetchMessages = () => {
  const isDBInited = useGlobalStore(systemStatusSelectors.isDBInited);
  const [sessionId] = useSessionStore((s) => [s.activeId]);
  const [activeTopicId, useFetchMessages, isAIGenerating] = useChatStore((s) => [
    s.activeTopicId,
    s.useFetchMessages,
    chatSelectors.isAIGenerating(s),  // 添加AI生成状态检查
  ]);

  // 当AI不生成消息时才启用自动获取
  useFetchMessages(isDBInited && !isAIGenerating, sessionId, activeTopicId);
};
