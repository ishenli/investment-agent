'use client';

import { useQueryState } from 'nuqs';
import { parseAsString } from 'nuqs/server';
import { memo, useEffect } from 'react';
import { createStoreUpdater } from 'zustand-utils';

import { useChatStore } from '@renderer/store/chat';
import { useSessionStore } from '@renderer/store/session';
import { INBOX_SESSION_ID } from '@/app/const/session';
import { topicService } from '@renderer/services/topic';

// sync outside state to useSessionStore
const SessionHydration = memo(() => {
  const useStoreUpdater = createStoreUpdater(useSessionStore);
  const useChatStoreUpdater = createStoreUpdater(useChatStore);
  const [switchTopic] = useChatStore((s) => [s.switchTopic]);
  const sessions = useSessionStore((s) => s.sessions);

  // two-way bindings the url and session store
  const [session, setSession] = useQueryState(
    'session',
    parseAsString.withDefault(INBOX_SESSION_ID).withOptions({ history: 'replace', throttleMs: 50 }),
  );
  useStoreUpdater('activeId', session);
  useChatStoreUpdater('activeId', session);

  useEffect(() => {
    const unsubscribe = useSessionStore.subscribe(
      (s) => s.activeId,
      (state) => {
        switchTopic();
        setSession(state);
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // 内置 Agent 常驻会话（slug 形如 agent-<slug>-u<userId>）打开时自动激活最新 topic：
  // 定时任务的洞察对话都落在 topic 内，默认主消息流为空，若不自动选中最新 topic，
  // 会话打开后主体区域是空的，需要手动点 topic 才能看到对话。
  useEffect(() => {
    if (!session || session === INBOX_SESSION_ID) return;

    const builtinAgentSession = sessions.find(
      (s) => s.id === session && !!s.agentId && s.slug?.startsWith('agent-'),
    );
    if (!builtinAgentSession) return;

    if (useChatStore.getState().activeTopicId) return; // URL 已带 topic 参数

    let cancelled = false;
    (async () => {
      const topics = await topicService.getTopics({ sessionId: session });
      if (cancelled || topics.length === 0) return;
      await useChatStore.getState().switchTopic(topics[0].id);
    })();

    return () => {
      cancelled = true;
    };
  }, [session, sessions]);

  return null;
});

export default SessionHydration;
