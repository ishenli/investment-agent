/**
 * Account Repository
 *
 * 数据访问层：负责 accounts 表的数据库操作
 */
import { accounts } from '@/drizzle/schema';
import { eq, and, desc, SQL } from 'drizzle-orm';
import { BaseIntRepository, type CreateData, type UpdateData, type QueryOptions } from './base';

/**
 * Account 实体类型
 */
export type AccountEntity = typeof accounts.$inferSelect;

/**
 * 创建账户数据类型
 */
export type CreateAccountData = Omit<AccountEntity, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

/**
 * 更新账户数据类型
 */
export type UpdateAccountData = Partial<Omit<AccountEntity, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'>>;

/**
 * Account Repository
 * 管理账户数据
 */
export class AccountRepository extends BaseIntRepository<AccountEntity> {
  protected readonly enableSoftDelete = true;

  constructor() {
    super(accounts);
  }

  // ============== 查询操作 ==============

  /**
   * 根据用户 ID 查找所有账户
   */
  async findByUserId(userId: number): Promise<AccountEntity[]> {
    return this.findMany(eq(accounts.userId, userId));
  }

  /**
   * 根据账户 ID 和用户 ID 查找账户
   * 用于验证账户归属
   */
  async findByIdAndUserId(id: number, userId: number): Promise<AccountEntity | null> {
    return this.findOne(and(
      eq(accounts.id, id),
      eq(accounts.userId, userId)
    )!);
  }

  /**
   * 验证账户是否存在
   */
  async existsById(accountId: number): Promise<boolean> {
    return this.exists(eq(accounts.id, accountId));
  }

  /**
   * 验证账户归属权
   * 检查账户是否属于指定用户
   */
  async verifyOwnership(accountId: number, userId: number): Promise<boolean> {
    return this.exists(and(
      eq(accounts.id, accountId),
      eq(accounts.userId, userId)
    )!);
  }

  /**
   * 统计用户账户数量
   */
  async countByUserId(userId: number): Promise<number> {
    return this.count(eq(accounts.userId, userId));
  }

  /**
   * 根据用户 ID 分页查询账户
   */
  async findByUserIdPaginated(
    userId: number,
    limit: number,
    offset: number,
    orderBy: SQL[] = [desc(accounts.createdAt)]
  ): Promise<AccountEntity[]> {
    return this.findMany(eq(accounts.userId, userId), {
      limit,
      offset,
      orderBy,
    });
  }

  // ============== 创建操作 ==============

  /**
   * 创建账户
   */
  async createAccount(data: CreateAccountData): Promise<AccountEntity> {
    return this.create(data as CreateData<AccountEntity>);
  }

  // ============== 更新操作 ==============

  /**
   * 更新账户
   */
  async updateAccount(id: number, data: UpdateAccountData): Promise<AccountEntity | null> {
    return this.update(id, data);
  }
}

// 导出单例实例
export const accountRepository = new AccountRepository();
