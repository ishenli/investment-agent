/**
 * Next.js Instrumentation Hook
 *
 * 在服务端启动时执行一次，用于初始化数据库和内置 Agent
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // 只在 Node.js 运行时执行
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const logger = (await import('@server/base/logger')).default;

    try {
      logger.info('[Instrumentation] Starting application initialization...');

      // 1. 初始化数据库连接和迁移
      const { DatabaseManager } = await import('@server/lib/DatabaseManager');
      const dbManager = DatabaseManager.getInstance({
        userDataPath: process.env.NEXT_APP_USER_DATA || undefined,
      });
      await dbManager.initialize();
      logger.info('[Instrumentation] Database initialized and migrated');

      // 2. 初始化内置 Agents（依赖数据库）
      const agentService = (await import('@server/service/agentService')).default;
      await agentService.initializeBuiltinAgents();
      logger.info('[Instrumentation] Builtin agents initialized');

      logger.info('[Instrumentation] Application initialization completed');
    } catch (error) {
      logger.error('[Instrumentation] Failed to initialize:', error);
      // 不抛出错误，允许应用继续启动
    }
  }
}