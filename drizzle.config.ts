import path from 'path';

// 优先使用环境变量，否则使用用户主目录
const dbDir =
  process.env.INVESTMENT_AGENT_DATA_DIR ||
  path.join(process.env.HOME || '.', '.investment-agent');


console.log('[drizzle] drizzle.config.ts with dbDir is', dbDir);
export default {
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: path.join(dbDir, 'sqlite.db'),
  },
};
