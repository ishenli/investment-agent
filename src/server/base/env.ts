import os from 'os';
import path from 'path';

export * from '@/shared/utils/env';

export const isElectron = () => process.env.IN_ELECTRON === 'Y';

// PROJECT_ROOT: 运行环境的项目仓库
// process.cwd(): 本地开发兜底用，正常业务逻辑不应该操作该路径，不是一回事
export const getProjectRoot = () => {
  const isDev = process.env.NODE_ENV === 'development';

  if (isElectron()) {
    const userData = process.env.NEXT_APP_USER_DATA;
    if (!userData) {
      // Provide a safe fallback instead of returning empty string
      // Use a deterministic path under system temp directory to ensure DB/files are never placed under empty path
      const fallbackPath = path.join(os.tmpdir(), 'investment-agent-user-data');
      console.warn('NEXT_APP_USER_DATA not set in Electron mode, using fallback path:', fallbackPath);
      return fallbackPath;
    }
    return userData;
  }

  if (isDev) {
    return getProjectDir();
  }

  return getProjectDir();
};

export const getProjectDir = () => {
  if (process.env.PROJECT_DIR) {
    return process.env.PROJECT_DIR;
  }
  return process.cwd();
};


export const getHomeDir = () => {
  return process.env.HOME || os.homedir();
};


export const appendEnvPath = (current: string | undefined, entries: string[]): string => {
  const delimiter = process.platform === 'win32' ? ';' : ':';
  const existing = (current || '').split(delimiter).filter(Boolean);
  const merged = [...existing];
  entries.forEach(entry => {
    if (!entry || merged.includes(entry)) return;
    merged.push(entry);
  });
  return merged.join(delimiter);
};