import path from 'path';
import fs from 'fs';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { getProjectDir } from '@server/base/env';
import * as schema from '@drizzle/schema';

// 获取项目根目录
const projectDir = getProjectDir();

// 数据库文件路径 - 优先使用环境变量，否则使用项目目录
const dbPath = process.env.INVESTMENT_AGENT_DATA_DIR
  ? path.join(process.env.INVESTMENT_AGENT_DATA_DIR, 'sqlite.db')
  : `${projectDir}/sqlite.db`;

// const dbPath = `/Users/michael.sl/.investment-agent/sqlite.db`;

// 确保数据库目录存在
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 创建数据库连接
const sqlite = new Database(dbPath);

// 创建 Drizzle ORM 实例
export const db = drizzle(sqlite, { schema });

// 导出 schema
export { schema };
