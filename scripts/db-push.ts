import { createClient } from '@libsql/client';
import { execSync } from 'child_process';
import path from 'path';

const dbDir = process.env.INVESTMENT_AGENT_DATA_DIR || path.join(process.env.HOME || '.', '.investment-agent');
const dbUrl = `file:${path.join(dbDir, 'sqlite.db')}`;

async function main() {
  const client = createClient({ url: dbUrl });

  try {
    // drizzle-kit push 在 schema 变更后可能尝试重建已有索引导致 "already exists" 错误
    // 解决方案：先删除非 partial 索引，让 push 重新创建
    // 注意：partial index（带 WHERE 子句）不能预删除，因为 drizzle-kit 会自行生成 DROP + CREATE 对
    // 如果我们预删除了 partial index，drizzle 的 DROP INDEX（不带 IF EXISTS）会失败
    const result = await client.execute(
      `SELECT name, sql FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'`,
    );

    const toDrop = result.rows.filter((row) => {
      const sql = (row.sql as string) || '';
      return !sql.toUpperCase().includes('WHERE');
    });

    if (toDrop.length > 0) {
      console.log(`[db-push] Dropping ${toDrop.length} non-partial indexes before push...`);
      for (const row of toDrop) {
        const indexName = row.name as string;
        await client.execute(`DROP INDEX IF EXISTS "${indexName}"`);
      }
    }
  } catch {
    // 数据库可能不存在（首次运行），忽略错误
  } finally {
    client.close();
  }

  // 执行 drizzle-kit push
  execSync('drizzle-kit push --force', { stdio: 'inherit', env: process.env });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
