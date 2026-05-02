/**
 * Electron API 类型定义
 */

export interface ShowNativeNotificationOptions {
  title: string;
  body: string;
  link?: string;
  actions?: Array<{ id: string; label: string }>;
}

export interface ElectronNotificationAPI {
  showNativeNotification: (options: ShowNativeNotificationOptions) => Promise<void>;
  setBadgeCount: (count: number) => Promise<void>;
  clearBadgeCount: () => Promise<void>;
  onNotificationClick: (callback: (link?: string) => void) => void;
}

export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
}

export interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export interface UpdateError {
  message: string;
  detail?: string; // 原始错误信息，供调试用；message 字段用于存放 i18n key
}

export interface ElectronUpdater {
  checkForUpdates: () => Promise<void>;
  quitAndInstall: () => Promise<void>;
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => void;
  onUpdateError: (callback: (error: UpdateError) => void) => void;
  onUpdateNotAvailable: (callback: (info: { version: string }) => void) => void;
}

export interface ElectronAPI {
  versions: {
    electron: string;
    node: string;
    chrome: string;
  };
  updater: ElectronUpdater;
  notification?: ElectronNotificationAPI;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
