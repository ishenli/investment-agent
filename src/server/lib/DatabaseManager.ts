import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { getProjectDir, isDevelopment as isDev, isElectron } from '../base/env';
import * as schema from '../../../drizzle/schema';
import * as fs from 'fs';
import * as path from 'path';
import { LibSQLDatabase } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import logger from '../base/logger';

// 定义数据库类型，包含完整的 schema 查询能力
type DatabaseType = LibSQLDatabase<typeof schema>;

/**
 * 数据库管理器类
 *
 * 此类负责管理 Electron 应用中的 SQLite 数据库连接。
 * 它解决了原始实现中的一个问题：当 Electron 应用打包后，
 * 数据库文件可能不存在于应用目录中，导致无法访问数据库。
 *
 * 主要特性：
 * 1. 使用单例模式确保整个应用只有一个数据库连接实例
 * 2. 自动检测开发环境和生产环境，并相应地设置数据库路径
 * 3. 在生产环境中将数据库文件存储在用户数据目录中
 * 4. 提供数据库迁移功能
 * 5. 包含完善的错误处理和日志记录
 *
 * 特别处理了 Electron 打包后迁移文件访问的问题：
 * - 开发环境中直接从项目目录读取迁移文件
 * - 生产环境中从资源目录或用户数据目录读取迁移文件
 */
// 使用 globalThis 存储单例，避免 HMR 热重载导致静态属性丢失
const globalForDb = globalThis as unknown as {
  __databaseManagerInstance: DatabaseManager | undefined;
};

export class DatabaseManager {
  private db: DatabaseType | null = null;
  private client: any = null;
  private dbPath: string = '';
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  private constructor({
    userDataPath,
  }: {
    userDataPath?: string;
  } = {}) {
    this.userDataPath = userDataPath;
  }

  private userDataPath?: string;

  /**
   * 获取 DatabaseManager 单例实例
   *
   * @param options - 可选的配置参数
   * @param options.userDataPath - 用户数据目录路径（Desktop 应用需要）
   * @returns DatabaseManager 实例
   *
   * @example
   * // Web 应用使用（无参数）
   * const dbManager = DatabaseManager.getInstance();
   *
   * @example
   * // Desktop 应用使用（带参数）
   * const dbManager = DatabaseManager.getInstance({
   *   userDataPath: app.getPath('userData')
   * });
   */
  public static getInstance(options?: {
    userDataPath?: string;
  }): DatabaseManager {
    if (!globalForDb.__databaseManagerInstance) {
      globalForDb.__databaseManagerInstance = new DatabaseManager(options || {});
    }
    return globalForDb.__databaseManagerInstance;
  }

  /**
   * 初始化数据库连接和迁移
   *
   * 此方法应在应用启动时调用（如在 instrumentation.ts 中）
   * 它会确保数据库连接和迁移完成后再返回
   *
   * @returns Promise，在初始化完成后 resolve
   */
  public async initialize(): Promise<void> {
    // 如果已经初始化，直接返回
    if (this.initialized) {
      return;
    }

    // 如果正在初始化，等待完成
    if (this.initPromise) {
      return this.initPromise;
    }

    // 开始初始化
    this.initPromise = this.doInitialize();
    await this.initPromise;
    this.initPromise = null;
  }

  /**
   * 实际执行初始化的内部方法
   */
  private async doInitialize(): Promise<void> {
    logger.info('DatabaseManager: Starting initialization...');
    logger.info('isDev:' + isDev());

    try {
      // 检查必要的依赖是否存在
      try {
        await import('@libsql/client');
        await import('drizzle-orm/libsql');
      } catch (importError) {
        logger.error('DatabaseManager: Required dependencies not found:', importError);
        throw new Error(`Missing required database dependencies. Please ensure @libsql/client and drizzle-orm are installed. Error: ${importError}`);
      }
      // 在生产环境中，将数据库存储在用户数据目录中
      // 这样可以确保即使应用更新或重新安装，用户数据也不会丢失
      let projectDir: string;

      if (this.userDataPath) {
        // Desktop 应用：使用 userDataPath（开发和生产环境都适用）
        projectDir = this.userDataPath;
        logger.info('Using Desktop userDataPath:', { projectDir });
      } else {
        // Web 应用：使用项目目录
        projectDir = getProjectDir();
        logger.info('Using Web projectDir:', { projectDir });
      }

      // 确保目录存在
      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
      }
      this.dbPath = path.join(projectDir, 'sqlite.db');

      // 设置数据库文件路径
      logger.info('Database path:' + this.dbPath);

      // 检查数据库文件是否存在
      const dbExists = fs.existsSync(this.dbPath);

      // 创建 LibSQL 客户端 - 使用 file:// 协议
      this.client = createClient({
        url: `file:${this.dbPath}`
      });

      // 创建 Drizzle ORM 实例
      this.db = drizzle(this.client, { schema });

      logger.info(`Database initialized at: ${this.dbPath}`);

      // 如果是新数据库，可能需要运行迁移
      if (!dbExists) {
        logger.info('New database created, will run migrations');
      }

      // 执行迁移
      await this.migrate();

      this.initialized = true;
      logger.info('DatabaseManager: Initialization completed');
    } catch (error) {
      logger.error('DatabaseManager: Initialization failed:', error);
      throw new Error(`Database initialization failed: ${error}`);
    }
  }

  /**
   * 获取数据库实例 (Drizzle ORM)
   *
   * @returns Drizzle ORM 数据库实例
   * @throws Error 如果数据库未初始化
   */
  public getDb(): DatabaseType {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first or ensure instrumentation hook ran.');
    }
    return this.db;
  }

  /**
   * 获取原生 LibSQL 客户端实例
   *
   * @returns LibSQL 客户端实例
   */
  public getClient(): any {
    if (!this.client) {
      throw new Error('LibSQL client not initialized');
    }
    return this.client;
  }

  /**
   * 获取数据库文件路径
   *
   * @returns 数据库文件的完整路径
   */
  public getDbPath(): string {
    return this.dbPath;
  }

  /**
   * 关闭数据库连接
   *
   * 在应用退出时应该调用此方法以正确关闭数据库连接
   */
  public close(): void {
    if (this.client) {
      this.client.close();
      logger.info('Database connection closed');
    }
  }

  /**
   * 执行数据库迁移
   *
   * 此方法会将数据库结构更新到最新版本
   * 应该在应用启动时或需要更新数据库结构时调用
   *
   * 特别处理了 Electron 打包后迁移文件访问的问题：
   * - 开发环境中跳过迁移（使用 db:push）
   * - 生产环境中执行迁移
   */
  public async migrate(): Promise<void> {
    try {
      // 开发环境使用 db:push，不执行迁移
      if (isDev()) {
        logger.info('Development environment: skipping migration (use db:push instead)');
        return;
      }

      if (!this.db) {
        throw new Error('Database not initialized');
      }

      let migrationsFolder: string;

      // 确定迁移文件夹路径
      if (isElectron()) {
        // Electron 生产环境中使用用户数据目录中的迁移文件，cwd 指向 standalone 目录
        migrationsFolder = path.join(process.cwd(), 'drizzle/migrations');
      } else {
        // Web 生产环境中使用项目目录中的迁移文件
        migrationsFolder = path.join(getProjectDir(), 'drizzle/migrations');
      }

      logger.info('Migrations folder:', { migrationsFolder });

      // 检查迁移文件夹是否存在
      if (!fs.existsSync(migrationsFolder)) {
        logger.warn(`Migrations folder not found: ${migrationsFolder}`);
        logger.warn('Skipping migrations');
        return;
      }

      // 执行迁移
      await migrate(this.db, { migrationsFolder: migrationsFolder });

      logger.info('Database migration completed');
    } catch (error) {
      logger.error('Database migration failed:', error);
      throw new Error(`Database migration failed: ${error}`);
    }
  }

  /**
   * 检查数据库是否已初始化
   *
   * @returns 如果数据库已成功初始化则返回 true，否则返回 false
   */
  public isInitialized(): boolean {
    return this.initialized && this.db !== null && this.client !== null;
  }
}