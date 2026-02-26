// 导入新的数据库管理器
import { DatabaseManager } from './DatabaseManager';
import * as schema from '@drizzle/schema';

/**
 * 数据库实例导出文件
 *
 * 此文件已被重构以使用 DatabaseManager 类来管理数据库连接。
 * 这解决了 Electron 应用打包后数据库文件路径的问题。
 *
 * 数据库初始化在 instrumentation.ts 中完成，确保在应用启动时
 * 数据库已准备好。
 *
 * 注意：如果在此文件被导入时数据库尚未初始化，getDb() 会抛出错误。
 * 当前实现使用惰性获取模式，在运行时获取数据库实例。
 */

// 获取 DatabaseManager 实例（不再立即调用 getDb）
const databaseManager = DatabaseManager.getInstance({
  userDataPath: process.env.NEXT_APP_USER_DATA || undefined,
});

/**
 * 获取数据库实例
 *
 * 此函数在运行时获取数据库实例，确保 instrumentation 已完成初始化
 */
const getDbInstance = () => databaseManager.getDb();

// 导出数据库实例（惰性获取）
// 使用 Proxy 实现惰性初始化，避免在模块加载时立即获取 db
export const db = new Proxy({} as ReturnType<typeof getDbInstance>, {
  get(_, prop) {
    const actualDb = getDbInstance();
    return actualDb[prop as keyof typeof actualDb];
  },
});

// 导出 schema
export { schema };