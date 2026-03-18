/**
 * Electron API 类型定义
 */

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
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
