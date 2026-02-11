import { db } from '@server/lib/db';
import { users, accountFunds, userSelectedAccounts, accounts } from '@/drizzle/schema';
import { eq, and, or } from 'drizzle-orm';
import { verifyJwtToken, signJwtToken, type DecodedJwtPayload, type JwtPayload } from '@server/utils/jwt';
import bcrypt from 'bcryptjs';
import logger from '../base/logger';
import { AccountType } from '@/types';
import type { AuthUser } from '@/types/auth';

export class AuthService {
  static async getCurrentUserAccount(): Promise<AccountType | null> {
    const userId = await this.getCurrentUserId();
    return this.getUserSelectedAccount(userId);
  }
  /**
   * 从请求中获取当前用户ID
   * 在实际实现中，这应该从JWT token或其他认证机制中获取
   * @param request HTTP请求对象
   * @returns 用户ID或null（如果未认证）
   */
  static async getCurrentUserId(request?: Request): Promise<string> {
    // 在实际应用中，这里应该：
    // 1. 从请求头中获取认证token
    // 2. 验证token的有效性
    // 3. 解析token获取用户ID
    // 4. 验证用户是否存在

    // // 如果提供了request对象，尝试从Authorization头获取token
    // if (request) {
    //   const authHeader = request.headers.get('Authorization');
    //   if (authHeader && authHeader.startsWith('Bearer ')) {
    //     const token = authHeader.substring(7); // 移除 "Bearer " 前缀
    //     // 验证JWT token并解析用户ID
    //     const payload = verifyJwtToken(token);
    //     if (payload && payload.userId) {
    //       // 验证用户是否存在

    //     }
    //   }
    // }
    try {
      const payload = {
        userId: '1',
      };
      const user = await db.query.users.findFirst({
        where: eq(users.id, parseInt(payload.userId)),
      });

      if (user) {
        return payload.userId;
      }
    } catch (error) {
      logger.error('Error validating user:', error);
    }

    // 如果没有有效的用户ID，返回默认用户ID（仅用于开发环境）
    return '';
  }

  /**
   * 验证用户是否有权访问指定账户
   * @param userId 用户ID
   * @param accountId 账户ID
   * @returns 是否有权访问
   */
  static async userHasAccessToAccount(userId: string, accountId: string): Promise<boolean> {
    try {
      // 查询账户是否属于该用户
      const account = await db.query.accounts.findFirst({
        where: eq(accounts.id, parseInt(accountId)),
      });

      return !!account && account.userId.toString() === userId;
    } catch (error) {
      logger.error('Error checking account access:', error);
      return false;
    }
  }

  /**
   * 从JWT token中解析用户信息
   * @param token JWT token
   * @returns 解析后的用户信息
   */
  static parseJwtToken(token: string): JwtPayload | null {
    try {
      return verifyJwtToken(token);
    } catch (error) {
      console.error('Error parsing JWT token:', error);
      return null;
    }
  }

  /**
   * 获取用户选择的账户
   * @param userId 用户ID
   * @returns 用户选择的账户ID或null
   */
  static async getUserSelectedAccount(userId: string): Promise<AccountType | null> {
    try {
      const selectedAccountId = await db.query.userSelectedAccounts.findFirst({
        where: eq(userSelectedAccounts.userId, parseInt(userId)),
        orderBy: (userSelectedAccounts, { desc }) => [desc(userSelectedAccounts.updatedAt)],
      });

      if (!selectedAccountId) {
        return null;
      }

      const selectedAccount = await db.query.accounts.findFirst({
        where: eq(accounts.id, selectedAccountId.accountId),
      });

      return selectedAccount ? (selectedAccount as unknown as AccountType) : null;
    } catch (error) {
      console.error('Error getting user selected account:', error);
      return null;
    }
  }

  /**
   * 设置用户选择的账户
   * @param userId 用户ID
   * @param accountId 账户ID
   */
  static async setUserSelectedAccount(userId: string, accountId: string): Promise<void> {
    try {
      // 检查账户是否属于该用户
      const account = await db.query.accounts.findFirst({
        where: and(eq(accounts.id, parseInt(accountId)), eq(accounts.userId, parseInt(userId))),
      });

      if (!account) {
        throw new Error('Account does not belong to user');
      }

      // 检查是否已存在该用户的选中账户记录
      const existing = await db.query.userSelectedAccounts.findFirst({
        where: eq(userSelectedAccounts.userId, parseInt(userId)),
      });

      if (existing) {
        // 更新现有记录
        await db
          .update(userSelectedAccounts)
          .set({
            accountId: parseInt(accountId),
            updatedAt: new Date(),
          })
          .where(eq(userSelectedAccounts.userId, parseInt(userId)));
      } else {
        // 插入新记录
        await db.insert(userSelectedAccounts).values({
          userId: parseInt(userId),
          accountId: parseInt(accountId),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      logger.error('Error setting user selected account:', error);
      throw error;
    }
  }

  // ==================== 认证相关方法 ====================

  /**
   * 密码哈希
   * @param password 明文密码
   * @returns 哈希后的密码
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * 密码验证
   * @param password 明文密码
   * @param hash 哈希密码
   * @returns 是否匹配
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * 生成 JWT Token
   * @param user 用户对象
   * @returns JWT Token
   */
  static generateToken(user: AuthUser): string {
    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
    };
    return signJwtToken(payload);
  }

  /**
   * 验证 JWT Token
   * @param token JWT Token
   * @returns 用户信息或 null
   */
  static async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const payload = verifyJwtToken(token);
      if (!payload || !payload.userId) {
        return null;
      }

      // 验证用户是否仍然存在
      const user = await db.query.users.findFirst({
        where: eq(users.id, parseInt(payload.userId)),
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id.toString(),
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      logger.error('Error verifying token:', error);
      return null;
    }
  }

  /**
   * 用户注册
   * @param username 用户名
   * @param password 密码
   * @returns 注册的用户和 Token
   */
  static async registerUser(username: string, password: string): Promise<{ user: AuthUser; token: string }> {
    // 检查用户名是否已存在
    const existingUser = await db.query.users.findFirst({
      where: or(eq(users.username, username), eq(users.email, username)),
    });

    if (existingUser) {
      throw new Error('用户名已存在');
    }

    // 哈希密码
    const passwordHash = await this.hashPassword(password);

    // 创建用户
    const [newUser] = await db
      .insert(users)
      .values({
        username,
        email: `${username}@example.com`, // 生成默认邮箱
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    if (!newUser) {
      throw new Error('创建用户失败');
    }

    const user: AuthUser = {
      id: newUser.id.toString(),
      username: newUser.username,
      email: newUser.email,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };

    // 生成 Token
    const token = this.generateToken(user);

    return { user, token };
  }

  /**
   * 用户登录
   * @param username 用户名
   * @param password 密码
   * @returns 登录的用户和 Token
   */
  static async loginUser(username: string, password: string): Promise<{ user: AuthUser; token: string }> {
    // 查找用户
    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!user) {
      throw new Error('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await this.verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('用户名或密码错误');
    }

    const authUser: AuthUser = {
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // 生成 Token
    const token = this.generateToken(authUser);

    return { user: authUser, token };
  }

  /**
   * 检查认证状态
   * @param token JWT Token
   * @returns 认证状态和用户信息
   */
  static async checkAuthStatus(token: string): Promise<{ isAuthenticated: boolean; user: AuthUser | null }> {
    try {
      const user = await this.verifyToken(token);
      return {
        isAuthenticated: !!user,
        user,
      };
    } catch (error) {
      logger.error('Error checking auth status:', error);
      return {
        isAuthenticated: false,
        user: null,
      };
    }
  }

  /**
   * 检查用户是否存在（用于判断显示登录或注册表单）
   * @returns 是否有用户存在
   */
  static async hasUsers(): Promise<boolean> {
    try {
      const user = await db.query.users.findFirst();
      return !!user;
    } catch (error) {
      logger.error('Error checking if users exist:', error);
      return false;
    }
  }
}

const authService = new AuthService();
export default authService;
