import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { getProjectDir } from '@server/base/env';
import * as schema from '@drizzle/schema';

// 获取项目根目录
const projectDir = getProjectDir();

// 数据库文件路径
const dbPath = `${projectDir}/sqlite.db`;

// 创建数据库连接
const sqlite = new Database(dbPath);

// 创建 Drizzle ORM 实例
export const db = drizzle(sqlite, { schema });

// 导出 schema
export { schema };
