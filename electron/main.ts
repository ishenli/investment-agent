import { app, BrowserWindow, nativeImage, dialog, session, utilityProcess, ipcMain, Tray, Menu, Notification } from 'electron';
import path from 'path';
import { execFileSync } from 'child_process';
import fs from 'fs';
import net from 'net';
import os from 'os';
import log from 'electron-log/main';
import { updateManager } from './updater';

// 初始化 electron-log
log.initialize();
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.info('[Log] electron-log initialized');

// 扩展 Electron app 类型以添加自定义属性

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let serverProcess: Electron.UtilityProcess | null = null;
let serverPort: number | null = null;
let serverErrors: string[] = [];
let serverExited = false;
let serverExitCode: number | null = null;
let userShellEnv: Record<string, string> = {};

const isDev = !app.isPackaged;

// 标记应用是否正在退出（用于控制窗口关闭行为）
(app as any).isQuitting = false;

/**
 * Verify that better_sqlite3.node in standalone resources is compatible
 * with this Electron runtime's ABI. If it was built for a different
 * Node.js ABI (e.g. system Node v22 ABI 127 vs Electron's ABI 143),
 * show a clear error instead of a cryptic MODULE_NOT_FOUND crash.
 */
function checkNativeModuleABI(): void {
  if (isDev) return; // Skip in dev mode

  const standaloneDir = path.join(process.resourcesPath, 'standalone');

  // Find better_sqlite3.node recursively
  function findNodeFile(dir: string): string | null {
    if (!fs.existsSync(dir)) return null;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = findNodeFile(fullPath);
        if (found) return found;
      } else if (entry.name === 'better_sqlite3.node') {
        return fullPath;
      }
    }
    return null;
  }

  const nodeFile = findNodeFile(path.join(standaloneDir, 'node_modules'));
  if (!nodeFile) {
    console.warn('[ABI check] better_sqlite3.node not found in standalone resources');
    return;
  }

  try {
    // Attempt to load the native module to verify ABI compatibility
    process.dlopen({ exports: {} } as NodeModule, nodeFile);
    console.log(`[ABI check] better_sqlite3.node ABI is compatible (${nodeFile})`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('NODE_MODULE_VERSION')) {
      console.error(`[ABI check] ABI mismatch detected: ${msg}`);
      dialog.showErrorBox(
        'ig - Native Module ABI Mismatch',
        `The bundled better-sqlite3 native module was compiled for a different Node.js version.\n\n` +
        `${msg}\n\n` +
        `This usually means the build process did not correctly recompile native modules for Electron.\n` +
        `Please rebuild the application or report this issue.`
      );
      app.quit();
    } else {
      // Other load errors (missing dependencies, etc.) -- log but don't block
      console.warn(`[ABI check] Could not verify better_sqlite3.node: ${msg}`);
    }
  }
}

/**
 * Read the user's full shell environment by running a login shell.
 * When Electron is launched from Dock/Finder (macOS) or desktop launcher
 * (Linux), process.env is very limited and won't include vars from
 * .zshrc/.bashrc (e.g. API keys, nvm PATH).
 */
function loadUserShellEnv(): Record<string, string> {
  // Windows GUI apps inherit the full user environment
  if (process.platform === 'win32') {
    return {};
  }
  try {
    const shell = process.env.SHELL || '/bin/zsh';
    const result = execFileSync(shell, ['-ilc', 'env'], {
      timeout: 5000,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const env: Record<string, string> = {};
    for (const line of result.split('\n')) {
      const idx = line.indexOf('=');
      if (idx > 0) {
        const key = line.slice(0, idx);
        const value = line.slice(idx + 1);
        env[key] = value;
      }
    }
    console.log(`Loaded ${Object.keys(env).length} env vars from user shell`);
    return env;
  } catch (err) {
    console.warn('Failed to load user shell env:', err);
    return {};
  }
}

function getPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        const port = addr.port;
        server.close(() => resolve(port));
      } else {
        server.close(() => reject(new Error('Failed to get port')));
      }
    });
  });
}

async function waitForServer(port: number, timeout = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    // If the server process already exited, fail fast
    if (serverExited) {
      throw new Error(
        `Server process exited with code ${serverExitCode}.\n\n${serverErrors.join('\n')}`
      );
    }
    try {
      await new Promise<void>((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const req = require('http').get(`http://127.0.0.1:${port}/api/health`, (res: { statusCode?: number }) => {
          if (res.statusCode === 200) resolve();
          else reject(new Error(`Status ${res.statusCode}`));
        });
        req.on('error', reject);
        req.setTimeout(1000, () => {
          req.destroy();
          reject(new Error('timeout'));
        });
      });
      return;
    } catch {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  throw new Error(
    `Server startup timeout after ${timeout / 1000}s.\n\n${serverErrors.length > 0 ? 'Server output:\n' + serverErrors.slice(-10).join('\n') : 'No server output captured.'}`
  );
}

function startServer(port: number): Electron.UtilityProcess {
  const standaloneDir = path.join(process.resourcesPath, 'standalone');
  const serverPath = path.join(standaloneDir, 'server.js');

  console.log(`Server path: ${serverPath}`);
  console.log(`Standalone dir: ${standaloneDir}`);

  serverErrors = [];
  serverExited = false;
  serverExitCode = null;

  const home = os.homedir();
  const shellPath = userShellEnv.PATH || process.env.PATH || '';
  const sep = path.delimiter; // ';' on Windows, ':' on Unix

  let constructedPath: string;
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    const winExtra = [
      path.join(appData, 'npm'),
      path.join(localAppData, 'npm'),
      path.join(home, '.npm-global', 'bin'),
      path.join(home, '.local', 'bin'),
      path.join(home, '.claude', 'bin'),
    ];
    const allParts = [shellPath, ...winExtra].join(sep).split(sep).filter(Boolean);
    constructedPath = [...new Set(allParts)].join(sep);
  } else {
    const basePath = `/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin`;
    const raw = `${basePath}:${home}/.npm-global/bin:${home}/.local/bin:${home}/.claude/bin:${shellPath}`;
    const allParts = raw.split(':').filter(Boolean);
    constructedPath = [...new Set(allParts)].join(':');
  }

  const env: Record<string, string> = {
    ...userShellEnv,
    ...(process.env as Record<string, string>),
    // Ensure user shell env vars override (especially API keys)
    ...userShellEnv,
    PORT: String(port),
    HOSTNAME: '127.0.0.1',
    HOME: home,
    USERPROFILE: home,
    IN_ELECTRON: 'Y',
    NEXT_APP_USER_DATA: app.getPath('userData'),
    NEXT_APP_DATA_PATH: app.getAppPath(),
    PATH: constructedPath,
  };

  // Use Electron's utilityProcess to run the server in a child process
  // without spawning a separate Dock icon on macOS.
  const child = utilityProcess.fork(serverPath, [], {
    env,
    cwd: standaloneDir,
    stdio: 'pipe',
    serviceName: 'ig-server',
  });

  child.stdout?.on('data', (data: Buffer) => {
    const msg = data.toString().trim();
    console.log(`[server] ${msg}`);
    serverErrors.push(msg);
  });

  child.stderr?.on('data', (data: Buffer) => {
    const msg = data.toString().trim();
    console.error(`[server:err] ${msg}`);
    serverErrors.push(msg);
  });

  child.on('exit', (code) => {
    console.log(`Server process exited with code ${code}`);
    serverExited = true;
    serverExitCode = code;
    serverProcess = null;
  });

  return child;
}

function getIconPath(): string {
  if (isDev) {
    return path.join(process.cwd(), 'build', 'icon.png');
  }
  if (process.platform === 'win32') {
    return path.join(process.resourcesPath, 'icon.ico');
  }
  if (process.platform === 'linux') {
    return path.join(process.resourcesPath, 'icon.png');
  }
  return path.join(process.resourcesPath, 'icon.icns');
}

/**
 * 获取托盘图标路径 (macOS 上优先使用 PNG)
 */
function getTrayIconPath(): string {
  if (isDev) {
    return path.join(process.cwd(), 'build', 'icon.png');
  }
  // macOS 打包后，尝试使用 PNG 格式的托盘图标
  if (process.platform === 'darwin') {
    const pngPath = path.join(process.resourcesPath, 'ig.png');
    if (fs.existsSync(pngPath)) {
      return pngPath;
    }
    // 如果 PNG 不存在，回退到 icns
    return path.join(process.resourcesPath, 'icon.icns');
  }
  if (process.platform === 'win32') {
    return path.join(process.resourcesPath, 'icon.ico');
  }
  return path.join(process.resourcesPath, 'icon.png');
}

function createWindow(port: number) {
  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: 1480,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  };

  if (process.platform === 'darwin') {
    windowOptions.titleBarStyle = 'hiddenInset';
  } else if (process.platform === 'win32') {
    windowOptions.titleBarStyle = 'hidden';
    windowOptions.titleBarOverlay = {
      color: '#00000000',
      symbolColor: '#888888',
      height: 44,
    };
  }

  mainWindow = new BrowserWindow(windowOptions);

  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 任务 1.7: 修改窗口关闭事件，隐藏窗口而非关闭
  mainWindow.on('close', (event) => {
    // 阻止默认关闭行为，最小化到托盘
    if (!(app as any).isQuitting) {
      event.preventDefault();
      mainWindow?.hide();

      // macOS 上隐藏 Dock 图标
      if (process.platform === 'darwin' && app.dock) {
        app.dock.hide();
      }

      log.info('[Tray] Window minimized to tray');
    }
  });
}

/**
 * 创建系统托盘
 */
function createTray(): void {
  log.info('[Tray] Starting tray creation...');
  log.info(`[Tray] Platform: ${process.platform}`);
  log.info(`[Tray] Is packaged: ${app.isPackaged}`);

  const trayIconPath = getTrayIconPath();
  log.info(`[Tray] Tray icon path: ${trayIconPath}`);

  // 检查图标文件是否存在
  const iconExists = fs.existsSync(trayIconPath);
  log.info(`[Tray] Icon file exists: ${iconExists}`);

  // 创建托盘图标
  const icon = nativeImage.createFromPath(trayIconPath);
  log.info(`[Tray] Icon is empty: ${icon.isEmpty()}`);
  log.info(`[Tray] Icon size: ${icon.getSize().width}x${icon.getSize().height}`);

  // 如果图标加载失败，创建一个空图标
  const trayIcon = icon.isEmpty()
    ? nativeImage.createEmpty()
    : icon.resize({ width: 16, height: 16 });

  log.info(`[Tray] Creating tray with icon...`);

  try {
    tray = new Tray(trayIcon);
    log.info('[Tray] Tray created successfully');
  } catch (error) {
    log.error('[Tray] Failed to create tray:', error);
    return;
  }

  tray.setToolTip('Investment Agent');
  log.info('[Tray] Tooltip set');

  // 任务 1.4: 为托盘添加右键菜单，包含"显示"和"退出"选项
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        log.info('[Tray] Menu: Show window clicked');
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();

          // macOS 上恢复 Dock 图标
          if (process.platform === 'darwin' && app.dock) {
            app.dock.show();
          }
        }
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        log.info('[Tray] Menu: Quit clicked');
        (app as any).isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  log.info('[Tray] Context menu set');

  // 任务 1.5: 双击托盘图标恢复窗口
  tray.on('double-click', () => {
    log.info('[Tray] Double-click event');
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();

      // macOS 上恢复 Dock 图标
      if (process.platform === 'darwin' && app.dock) {
        app.dock.show();
      }
    }
  });

  log.info('[Tray] System tray fully initialized');
}

app.whenReady().then(async () => {
  // Load user's full shell environment (API keys, PATH, etc.)
  userShellEnv = loadUserShellEnv();

  // Verify native module ABI compatibility before starting the server
  checkNativeModuleABI();
  

  // Clear cache on version upgrade
  const currentVersion = app.getVersion();
  const versionFilePath = path.join(app.getPath('userData'), 'last-version.txt');
  try {
    const lastVersion = fs.existsSync(versionFilePath)
      ? fs.readFileSync(versionFilePath, 'utf-8').trim()
      : '';
    if (lastVersion && lastVersion !== currentVersion) {
      console.log(`Version changed from ${lastVersion} to ${currentVersion}, clearing cache...`);
      await session.defaultSession.clearCache();
      await session.defaultSession.clearStorageData({
        storages: ['cachestorage', 'serviceworkers'],
      });
      console.log('Cache cleared successfully');
    }
    fs.writeFileSync(versionFilePath, currentVersion, 'utf-8');
  } catch (err) {
    console.warn('Failed to check/clear version cache:', err);
  }

  // Set macOS Dock icon
  if (process.platform === 'darwin' && app.dock) {
    const iconPath = getIconPath();
    app.dock.setIcon(nativeImage.createFromPath(iconPath));
  }

  try {
    let port: number;

    if (isDev) {
      port = 8888;
      console.log(`Dev mode: connecting to http://127.0.0.1:${port}`);
    } else {
      port = await getPort();
      console.log(`Starting server on port ${port}...`);
      serverProcess = startServer(port);
      await waitForServer(port);
      console.log('Server is ready');
    }

    serverPort = port;
    createWindow(port);

    // 创建系统托盘
    createTray();

    // 设置自动更新（仅在打包环境下）
    if (!isDev && mainWindow) {
      updateManager.setMainWindow(mainWindow);
      updateManager.setupPeriodicCheck(); // 启动后30秒首次检查，之后每小时检查一次
    }
  } catch (err) {
    console.error('Failed to start:', err);
    dialog.showErrorBox(
      'ig - Failed to Start',
      `The internal server could not start.\n\n${err instanceof Error ? err.message : String(err)}\n\nPlease try restarting the application.`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  for (const off of registeredIPCCallbacks) {
    try {
      off();
    } catch (ex) {
      // Some kind of object leak bug here, but we don't leak so it
      // looks like "expected results" from the next-gen loader, best
      // to just ignore it.
    }
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    try {
      if (!isDev && !serverProcess) {
        const port = await getPort();
        serverProcess = startServer(port);
        await waitForServer(port);
        serverPort = port;
      }
      
      // Guard against undefined/null serverPort
      if (serverPort === null || serverPort === undefined) {
        console.error('Server port is not defined - showing error dialog');
        dialog.showErrorBox(
          'ig - Server Not Ready',
          'The application server is not ready yet. Please wait a moment and try again, or restart the application.'
        );
        return;
      }
      
      createWindow(serverPort);
      
      // 重新设置自动更新
      if (!isDev && mainWindow) {
        updateManager.setMainWindow(mainWindow);
      }
    } catch (err) {
      console.error('Failed to restart server:', err);
      dialog.showErrorBox(
        'ig - Failed to Restart',
        `Could not restart the internal server.

${err instanceof Error ? err.message : String(err)}

Please try restarting the application.`
      );
    }
  }
});

app.on('before-quit', () => {
  // 设置退出标志，确保窗口关闭时不阻止退出
  (app as any).isQuitting = true;

  // 清理托盘
  if (tray) {
    tray.destroy();
    tray = null;
  }

  // 终止服务器进程
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});

// 将需要监听的事件告知 IPC渲染器
const registeredIPCCallbacks: Array<() => void> = [];

// 注册更新相关 IPC handler（无条件注册，不依赖 mainWindow 是否存在）
// 原先包裹在 if (mainWindow) 中导致 mainWindow 为 null 时 handler 未注册，
// 前端调用 ipcRenderer.invoke('check-for-updates') 会抛出 "No handler registered" 错误
ipcMain.handle('check-for-updates', async () => {
  await updateManager.checkForUpdates();
});

ipcMain.handle('quit-and-install', () => {
  updateManager.quitAndInstall();
});

// 注册通知相关 IPC handler
ipcMain.handle('show-native-notification', async (_event, options: { title: string; body: string; link?: string; actions?: Array<{ id: string; label: string }> }) => {
  const { title, body, link, actions } = options;

  const notificationActions = actions?.map(a => ({
    type: 'button' as const,
    text: a.label,
  }));

  const notification = new Notification({
    title,
    body,
    actions: notificationActions,
    silent: false,
  });

  notification.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('notification-clicked', link);
    }
  });

  notification.on('action', (_event, index) => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      const action = actions?.[index];
      if (action?.id === 'mark-as-read') {
        mainWindow.webContents.send('mark-notification-read');
      } else {
        mainWindow.webContents.send('notification-clicked', link);
      }
    }
  });

  notification.show();
});

ipcMain.handle('set-badge-count', (_event, count: number) => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setBadge(count > 0 ? String(count) : '');
  }
  // Windows overlay badge can be added here when Windows support is needed
});

ipcMain.handle('clear-badge-count', () => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setBadge('');
  }
});

registeredIPCCallbacks.push(() => {
  ipcMain.removeHandler('check-for-updates');
  ipcMain.removeHandler('quit-and-install');
  ipcMain.removeHandler('show-native-notification');
  ipcMain.removeHandler('set-badge-count');
  ipcMain.removeHandler('clear-badge-count');
});
