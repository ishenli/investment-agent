import { useChatStore } from '@renderer/store/chat';
import { useSessionStore } from '@renderer/store/session';
import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export const useSwitchSession = () => {
  const switchSession = useSessionStore((s) => s.switchSession);
  const pathname = usePathname();
  const { push } = useRouter();

  return useCallback(
    (id: string) => {
      switchSession(id);

      const chatPath = '/chat';
      console.warn('useSwitchSession', pathname, chatPath);
      if (pathname !== chatPath) {
        setTimeout(() => {
          push(`${chatPath}?id=${id}&showMobileWorkspace=true`);
        });
      }
    },
    [pathname],
  );
};
