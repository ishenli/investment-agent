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

    // 监听更新可用事件
    updater.onUpdateAvailable((info: UpdateInfo) => {
      console.log('发现新版本:', info.version);
      setStatus('available');
      setUpdateInfo(info);
      setError(null);
    });

    // 监听下载进度
    updater.onDownloadProgress((progress: DownloadProgress) => {
      console.log('下载进度:', progress.percent.toFixed(2) + '%');
      setStatus('downloading');
      setDownloadProgress(progress);
    });

    // 监听更新错误
    updater.onUpdateError((err: UpdateError) => {
      console.error('更新失败:', err.message);
      setStatus('error');
      setError(err);
    });
  }, [isElectron]);

  // 检查更新
  const checkForUpdates = useCallback(async () => {
    if (!window.electronAPI?.updater) {
      return;
    }

    try {
      setStatus('checking');
      setError(null);
      await window.electronAPI.updater.checkForUpdates();
      
      // 如果没有发现新版本，会在一段时间后没有收到 update-available 事件
      // 这里设置一个超时来判断是否已是最新版本
      setTimeout(() => {
        if (status === 'checking') {
          setStatus('up-to-date');
        }
      }, 5000);
    } catch (err) {
      console.error('检查更新失败:', err);
      setStatus('error');
      setError({ message: '检查更新失败' });
    }
  }, [status]);

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
