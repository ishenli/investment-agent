import { SessionDefaultGroup } from '@typings/session/sessionGroup';
import { AsyncLocalStorage } from '@renderer/lib/localStorage';

export enum ChatSettingsTabs {
  Chat = 'chat',
  Meta = 'meta',
  Modal = 'modal',
  Opening = 'opening',
  Plugin = 'plugin',
  Prompt = 'prompt',
  TTS = 'tts',
}

export interface GlobalState {
  isStatusInit: boolean;
  status: SystemStatus;
  statusStorage: AsyncLocalStorage<SystemStatus>;
}

export interface SystemStatus {
  // which sessionGroup should expand
  expandSessionGroupKeys: string[];
  filePanelWidth: number;
  hidePWAInstaller?: boolean;
  hideThreadLimitAlert?: boolean;
  imagePanelWidth: number;
  imageTopicPanelWidth?: number;
  inputHeight: number;
  /**
   * 应用初始化时不启用 PGLite，只有当用户手动开启时才启用
   */
  isEnablePglite?: boolean;
  isShowCredit?: boolean;
  latestChangelogId?: string;
  mobileShowPortal?: boolean;
  mobileShowTopic?: boolean;
  portalWidth: number;
  sessionsWidth: number;
  showChatSideBar?: boolean;
  showFilePanel?: boolean;
  showHotkeyHelper?: boolean;
  showImagePanel?: boolean;
  showImageTopicPanel?: boolean;
  showSessionPanel?: boolean;
  showSystemRole?: boolean;
  systemRoleExpandedMap: Record<string, boolean>;
  /**
   * theme mode
   */
  threadInputHeight: number;
  zenMode?: boolean;
}

export const INITIAL_STATUS = {
  expandSessionGroupKeys: [SessionDefaultGroup.Pinned, SessionDefaultGroup.Default],
  filePanelWidth: 320,
  hidePWAInstaller: false,
  hideThreadLimitAlert: false,
  imagePanelWidth: 320,
  imageTopicPanelWidth: 80,
  inputHeight: 200,
  mobileShowTopic: false,
  portalWidth: 400,
  sessionsWidth: 320,
  showChatSideBar: true,
  showFilePanel: true,
  showHotkeyHelper: false,
  showImagePanel: true,
  showImageTopicPanel: true,
  showSessionPanel: false,
  showSystemRole: false,
  systemRoleExpandedMap: {},
  threadInputHeight: 200,
  zenMode: false,
} satisfies SystemStatus;

export const initialState: GlobalState = {
  isStatusInit: true,
  status: INITIAL_STATUS,
  statusStorage: new AsyncLocalStorage('LOBE_SYSTEM_STATUS'),
};
