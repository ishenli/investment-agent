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

    // 初始化 Skills 的同步
    const skillManager = (await import('@server/lib/skillManager')).getSkillManager();

    try {
      skillManager.syncBundledSkillsToUserData();
      logger.info('[Instrumentation] initApp: syncBundledSkillsToUserData done');
    } catch (error) {
      logger.error('[Instrumentation] initApp: syncBundledSkillsToUserData failed:', error);
    }

    // 3. 同步内置 Skills 到所有已注册用户的 DB 偏好表
    //    确保 SKILL.md 文件的增删改能反映到管理 UI（create / update / prune）
    try {
      const { db } = await import('@server/lib/db');
      const { users } = await import('@/drizzle/schema');
      const { isNull } = await import('drizzle-orm');
      const { skillService } = await import('@server/service/skillService');

      const allUsers = await db.query.users.findMany({
        where: isNull(users.deletedAt),
        columns: { id: true },
      });

      if (allUsers.length > 0) {
        logger.info(`[Instrumentation] Syncing builtin skills for ${allUsers.length} user(s)...`);
        for (const user of allUsers) {
          try {
            const result = await skillService.syncBuiltinSkills(user.id);
            logger.info(
              `[Instrumentation] Skills synced for user ${user.id}: ` +
                `created=${result.created}, pruned=${result.pruned}`,
            );
          } catch (err) {
            logger.warn(`[Instrumentation] Skills sync failed for user ${user.id}:`, err);
          }
        }
      } else {
        logger.info('[Instrumentation] No users found, skipping builtin skills sync');
      }
    } catch (error) {
      logger.error('[Instrumentation] Failed to sync builtin skills:', error);
    }

    // 调用账户的初始化方法
    logger.info('[Instrumentation] Calling account initialization method...');
    const { AssetAccountBizController } = (await import('@server/controller/assetAccount'))
    const initController = new AssetAccountBizController();
    await initController.init();
    logger.info('[Instrumentation] Account initialization method completed');
  }
}