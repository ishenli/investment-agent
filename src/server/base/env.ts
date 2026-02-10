export const isProduction = () => process.env.NODE_ENV === 'production';

export const isDevelopment = () => process.env.NODE_ENV !== 'production';

export const isTest = () => process.env.NODE_ENV === 'test';

export const isElectron = () => process.env.IN_ELECTRON === 'Y';

// PROJECT_ROOT: 运行环境的项目仓库
// process.cwd(): 本地开发兜底用，正常业务逻辑不应该操作该路径，不是一回事
export const getProjectRoot = () => {
  const isDev = process.env.NODE_ENV === 'development';

  if (isElectron()) {
    return process.env.NEXT_APP_USER_DATA || '';
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
