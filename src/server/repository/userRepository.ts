/**
 * User Repository
 *
 * 数据访问层：负责 users 表的数据库操作
 */
import { users } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { BaseIntRepository, type CreateData } from './base';

/**
 * User 实体类型
 */
export type UserEntity = typeof users.$inferSelect;

/**
 * 创建用户数据类型
 */
export type CreateUserData = Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

/**
 * User Repository
 * 管理用户数据
 */
export class UserRepository extends BaseIntRepository<UserEntity> {
  protected readonly enableSoftDelete = true;

  constructor() {
    super(users);
  }

  // ============== 查询操作 ==============

  /**
   * 根据用户名查找用户
   */
  async findByUsername(username: string): Promise<UserEntity | null> {
    return this.findOne(eq(users.username, username));
  }

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.findOne(eq(users.email, email));
  }

  /**
   * 检查用户名是否已存在
   */
  async existsByUsername(username: string): Promise<boolean> {
    return this.exists(eq(users.username, username));
  }

  /**
   * 检查邮箱是否已存在
   */
  async existsByEmail(email: string): Promise<boolean> {
    return this.exists(eq(users.email, email));
  }

  // ============== 创建操作 ==============

  /**
   * 创建用户
   */
  async createUser(data: CreateUserData): Promise<UserEntity> {
    return this.create(data as CreateData<UserEntity>);
  }
}

// 导出单例实例
export const userRepository = new UserRepository();