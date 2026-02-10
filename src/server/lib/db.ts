// 导入新的数据库管理器
import { DatabaseManager } from './DatabaseManager';
import * as schema from '@drizzle/schema';

/**
 * 数据库实例导出文件
 * 
 * 此文件已被重构以使用 DatabaseManager 类来管理数据库连接。
 * 这解决了 Electron 应用打包后数据库文件路径的问题。
 * 
 * 原始实现直接创建了数据库连接，但在 Electron 打包的应用中，
 * 数据库文件可能不存在于应用目录中，导致无法访问数据库。
 * 
 * 新的实现使用 DatabaseManager 类，它会：
 * 1. 自动检测开发环境和生产环境
 * 2. 在生产环境中将数据库存储在用户数据目录中
 * 3. 确保数据库文件和目录存在
 * 4. 提供单例模式以避免重复连接
 */

// 获取 DatabaseManager 实例
const databaseManager = DatabaseManager.getInstance({
  userDataPath: process.env.NEXT_APP_USER_DATA || './',
  appPath: process.env.NEXT_APP_DATA_PATH || './',
});

// 导出数据库实例
export const db = databaseManager.getDb();

// 导出 schema
export { schema };