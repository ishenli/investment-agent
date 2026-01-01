import { useChatStore } from '@renderer/store/chat';
import { chatPortalSelectors } from '@renderer/store/chat/selectors';

export const useEnable = () => useChatStore(chatPortalSelectors.showArtifactUI);
