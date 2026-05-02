// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  versions: {
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
  },
  updater: {
    // 手动检查更新
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    // 立即安装更新并重启
    quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
    // 监听更新事件
    onUpdateAvailable: (callback: (info: unknown) => void) => {
      ipcRenderer.on('update-available', (_event: unknown, info: unknown) => callback(info));
    },
    onDownloadProgress: (callback: (progress: unknown) => void) => {
      ipcRenderer.on('download-progress', (_event: unknown, progress: unknown) => callback(progress));
    },
    onUpdateError: (callback: (error: unknown) => void) => {
      ipcRenderer.on('update-error', (_event: unknown, error: unknown) => callback(error));
    },
    onUpdateNotAvailable: (callback: (info: unknown) => void) => {
      ipcRenderer.on('update-not-available', (_event: unknown, info: unknown) => callback(info));
    },
  },
  notification: {
    showNativeNotification: (options: unknown) => ipcRenderer.invoke('show-native-notification', options),
    setBadgeCount: (count: number) => ipcRenderer.invoke('set-badge-count', count),
    clearBadgeCount: () => ipcRenderer.invoke('clear-badge-count'),
    onNotificationClick: (callback: (link?: string) => void) => {
      ipcRenderer.on('notification-clicked', (_event: unknown, link: string | undefined) => callback(link));
    },
  },
});