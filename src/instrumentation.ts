/**
 * Next.js Instrumentation Hook
 *
 * 在服务端启动时执行一次，用于初始化内置 Agent
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // 只在 Node.js 运行时执行
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const agentService = (await import('@server/service/agentService')).default;
    const logger = (await import('@server/base/logger')).default;

    try {
      logger.info('[Instrumentation] Starting application initialization...');
      await agentService.initializeBuiltinAgents();
      logger.info('[Instrumentation] Application initialization completed');
    } catch (error) {
      logger.error('[Instrumentation] Failed to initialize builtin agents:', error);
      // 不抛出错误，允许应用继续启动
    }
  }
}