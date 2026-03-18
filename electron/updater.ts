import { app, BrowserWindow } from 'electron';
import { autoUpdater, UpdateInfo } from 'electron-updater';
import log from 'electron-log';

/**
 * UpdateManager - 管理应用程序自动更新
 * 
 * 功能特性:
 * 1. 自动检测 GitHub Releases 上的新版本
 * 2. 下载更新并在后台安装
 * 3. 通知用户更新可用
 * 4. 安全地重启应用以应用更新
 * 
 * 使用流程:
 * 1. 应用启动后 30 秒首次检查更新
 * 2. 之后每小时自动检查一次
 * 3. 发现新版本时自动下载
 * 4. 下载完成后提示用户是否立即安装
 * 5. 用户可选择立即重启或稍后更新（退出时自动安装）
 * 
 * 数据安全:
 * - 用户数据存储在 userData 目录，更新不会影响
 * - 数据库文件、配置文件等都在 userData 目录中
 * - 更新只替换应用程序文件，不影响用户数据
 * 
 * GitHub Release 要求:
 * - Release 必须包含 latest-mac.yml 文件（electron-builder 自动生成）
 * - Release 必须是正式发布（非 draft）
 * - 版本号必须符合语义化版本规范（如 v0.6.0）
 * 
 * 前端集成示例:
 * ```typescript
 * // 在 React 组件中使用
 * useEffect(() => {
 *   if (window.electronAPI?.updater) {
 *     // 监听更新可用
 *     window.electronAPI.updater.onUpdateAvailable((info) => {
 *       console.log('发现新版本:', info.version);
 *     });
 *     
 *     // 监听下载进度
 *     window.electronAPI.updater.onDownloadProgress((progress) => {
 *       console.log('下载进度:', progress.percent);
 *     });
 *     
 *     // 手动检查更新
 *     window.electronAPI.updater.checkForUpdates();
 *   }
 * }, []);
 * ```
 */
export class UpdateManager {
  private mainWindow: BrowserWindow | null = null;
  private isCheckingUpdate = false;
  private updateDownloaded = false;

  constructor() {
    // 配置 electron-updater 日志
    log.transports.file.level = 'info';
    autoUpdater.logger = log;

    // 配置更新行为
    // 注意：由于签名问题暂时禁用自动下载，改为引导用户前往 GitHub Releases 手动下载
    // 待签名问题解决后可恢复 autoDownload = true 实现增量更新
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false; // 退出时自动安装（增量更新时使用）

    this.setupEventListeners();
  }

  /**
   * 设置主窗口引用（用于显示更新通知）
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * 检查更新（手动触发或定期检查）
   */
  async checkForUpdates(): Promise<void> {
    // 开发模式下跳过更新检查
    if (!app.isPackaged) {
      log.info('Development mode: skipping update check');
      return;
    }

    // 避免重复检查
    if (this.isCheckingUpdate) {
      log.info('Update check already in progress');
      return;
    }

    try {
      this.isCheckingUpdate = true;
      log.info('Checking for updates...');
      await autoUpdater.checkForUpdates();
    } catch (error) {
      log.error('Error checking for updates:', error);
      this.isCheckingUpdate = false;
    }
  }

  /**
   * 立即安装已下载的更新并重启应用
   */
  quitAndInstall(): void {
    if (this.updateDownloaded) {
      autoUpdater.quitAndInstall(false, true);
    } else {
      log.warn('No update downloaded yet');
    }
  }

  /**
   * 设置自动更新事件监听器
   */
  private setupEventListeners(): void {
    // 检查更新完成
    autoUpdater.on('checking-for-update', () => {
      log.info('Checking for update...');
    });

    // 发现可用更新
    autoUpdater.on('update-available', (info: UpdateInfo) => {
      log.info('Update available:', info.version);
      this.isCheckingUpdate = false;

      // 通知用户发现新版本
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('update-available', {
          version: info.version,
          releaseDate: info.releaseDate,
          releaseNotes: info.releaseNotes,
        });
      }
    });

    // 当前已是最新版本
    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      log.info('Update not available. Current version:', info.version);
      this.isCheckingUpdate = false;
      
      // 通知渲染进程当前已是最新版本
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('update-not-available', {
          version: info.version,
        });
      }
    });

    // 更新下载进度
    autoUpdater.on('download-progress', (progressObj) => {
      const message = `Downloaded ${progressObj.percent.toFixed(2)}%`;
      log.info(message);

      // 将进度发送到渲染进程
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('download-progress', {
          percent: progressObj.percent,
          bytesPerSecond: progressObj.bytesPerSecond,
          transferred: progressObj.transferred,
          total: progressObj.total,
        });
      }
    });

    // 更新下载完成
    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      log.info('Update downloaded:', info.version);
      this.updateDownloaded = true;
      this.isCheckingUpdate = false;

      // 显示对话框询问用户是否立即安装
      this.showUpdateDownloadedDialog(info);
    });

    // 更新错误
    autoUpdater.on('error', (error) => {
      log.error('Update error:', error);
      this.isCheckingUpdate = false;

      // 通知渲染进程更新失败
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('update-error', {
          message: error.message,
        });
      }
    });
  }

  /**
   * 显示更新下载完成对话框
   * 注意：由于签名问题暂时禁用增量更新，此方法保留供后续恢复使用
   * 恢复时取消注释 dialog 相关代码，并在顶部 import 中添加 dialog
   */
  private showUpdateDownloadedDialog(_info: UpdateInfo): void {
    // TODO: 待签名问题解决后，取消以下注释以恢复增量更新弹窗
    // const dialogOpts = {
    //   type: 'info' as const,
    //   buttons: ['立即重启', '稍后'],
    //   title: '更新已就绪',
    //   message: `新版本 ${info.version} 已下载完成`,
    //   detail: '应用将在重启后更新。是否立即重启应用？\n\n您的数据已自动保存，无需担心数据丢失。',
    // };
    //
    // dialog.showMessageBox(dialogOpts).then((result) => {
    //   if (result.response === 0) {
    //     // 用户选择立即重启
    //     this.quitAndInstall();
    //   }
    // });
    log.info('Update downloaded (silent mode): notifying renderer only');
  }

  /**
   * 设置定期检查更新（例如每小时检查一次）
   */
  setupPeriodicCheck(intervalMs = 3600000): void {
    // 应用启动后延迟 30 秒首次检查
    setTimeout(() => {
      this.checkForUpdates();
    }, 30000);

    // 定期检查更新
    setInterval(() => {
      this.checkForUpdates();
    }, intervalMs);
  }
}

export const updateManager = new UpdateManager();
