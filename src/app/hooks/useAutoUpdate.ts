import { useState, useEffect, useCallback } from 'react';
import type { UpdateInfo, DownloadProgress, UpdateError } from '@/types/electron';

type UpdateStatus = 
  | 'idle'           // 初始状态
  | 'checking'       // 检查中
  | 'available'      // 有新版本可用
  | 'downloading'    // 下载中
  | 'downloaded'     // 下载完成
  | 'up-to-date'     // 已是最新版本
  | 'error';         // 错误

interface UseAutoUpdateReturn {
  // 状态
  status: UpdateStatus;
  updateInfo: UpdateInfo | null;
  downloadProgress: DownloadProgress | null;
  error: UpdateError | null;
  isElectron: boolean;
  
  // 操作
  checkForUpdates: () => Promise<void>;
  installUpdate: () => void;
}

/**
 * 自动更新 Hook
 * 用于在前端组件中集成 Electron 自动更新功能
 */
export function useAutoUpdate(): UseAutoUpdateReturn {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<UpdateError | null>(null);
  
  // 在组件挂载时立即计算是否在 Electron 环境中
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.updater;

  useEffect(() => {
    if (!isElectron) {
      return;
    }
  
    const { updater } = window.electronAPI!;
  
    //监听更新可用事件
    const handleUpdateAvailable = (info: UpdateInfo) => {
      console.log('发现新版本:', info.version);
      setStatus('available');
      setUpdateInfo(info);
      setError(null);
    };
  
    //监听已是最新版本事件
    const handleUpdateNotAvailable = (info: { version: string }) => {
      console.log('当前已是最新版本:', info.version);
      setStatus('up-to-date');
      setError(null);
    };
  
    //监听下载进度
    const handleDownloadProgress = (progress: DownloadProgress) => {
      console.log('下载进度:', progress.percent.toFixed(2) + '%');
      setStatus('downloading');
      setDownloadProgress(progress);
    };
  
    // 监听更新错误
    const handleUpdateError = (err: UpdateError) => {
      console.error('更新失败:', err.message);
      setStatus('error');
      setError(err);
    };
  
    // 注册事件监听器
    updater.onUpdateAvailable(handleUpdateAvailable);
    updater.onUpdateNotAvailable(handleUpdateNotAvailable);
    updater.onDownloadProgress(handleDownloadProgress);
    updater.onUpdateError(handleUpdateError);
  
    //清理函数
    return () => {
      //移除事件监听器的逻辑应该在这里，但 Electron 的 ipcRenderer没有提供 off 方法
      //在实际应用中，可能需要在 Electron 主进程中处理
    };
  }, [isElectron]);

  // 检查更新
  const checkForUpdates = useCallback(async () => {
    if (!window.electronAPI?.updater) {
      return;
    }
  
    try {
      setStatus('checking');
      setError(null);
      setUpdateInfo(null);
      setDownloadProgress(null);
        
      await window.electronAPI.updater.checkForUpdates();
    } catch (err) {
      console.error('检查更新失败:', err);
      setStatus('error');
      setError({ message: '检查更新失败' });
    }
  }, []);

  // 安装更新
  const installUpdate = useCallback(() => {
    if (!window.electronAPI?.updater) {
      return;
    }

    window.electronAPI.updater.quitAndInstall();
  }, []);

  return {
    status,
    updateInfo,
    downloadProgress,
    error,
    isElectron,
    checkForUpdates,
    installUpdate,
  };
}
