import { db } from '@server/lib/db';
import { users, accounts } from '@/drizzle/schema';
import { eq, or } from 'drizzle-orm';
import { verifyJwtToken, signJwtToken, type JwtPayload } from '@server/utils/jwt';
import bcrypt from 'bcryptjs';
import logger from '../base/logger';
import { AccountType } from '@/types';
import type { AuthUser } from '@/types/auth';
import accountService from './accountService';

export class AuthService {
  async getCurrentUserAccount(): Promise<AccountType | null> {
    const userId = await this.getDefaultUserId();
    if (!userId) {
      return null;
    }

    return accountService.getUserSelectedAccount(userId);
  }

  async getDefaultUserId(): Promise<string> {
    // 获取 users table 中的第一个用户
    const userId = await db.query.users.findFirst();
    if (!userId) {
      return '';
    }
    return userId.id.toString();
  }
  /**
   * 从请求中获取当前用户ID
   * 从Authorization头或cookies中验证JWT token
   * @param request HTTP请求对象
   * @returns 用户ID或空字符串（如果未认证）
   */
  async getCurrentUserId(request?: Request): Promise<string> {
    if (!request) {
      logger.warn('getCurrentUserId called without request object');
      return this.getDefaultUserId();
    }

    let token: string | null = null;

    // 1. 尝试从Authorization头获取token
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // 2. 如果没有从header获取到，尝试从cookies获取（用于浏览器请求）
    if (!token && 'cookies' in request) {
      const cookies = (request as any).cookies;
      if (typeof cookies.get === 'function') {
        token = cookies.get('auth_token')?.value || null;
      }
    }

    // 3. 如果没有token，返回空字符串
    if (!token) {
      return '';
    }

    // 4. 验证JWT token
    const payload = verifyJwtToken(token);
    if (!payload || !payload.userId) {
      logger.warn('Invalid or expired JWT token');
      return '';
    }

    // 5. 验证用户是否存在
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, parseInt(payload.userId)),
      });

      if (user) {
        return payload.userId;
      }
    } catch (error) {
      logger.error('Error validating user:', error);
    }

    return '';
  }

  /**
   * 验证用户是否有权访问指定账户
   * @param userId 用户ID
   * @param accountId 账户ID
   * @returns 是否有权访问
   */
  async userHasAccessToAccount(userId: string, accountId: string): Promise<boolean> {
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
  parseJwtToken(token: string): JwtPayload | null {
    try {
      return verifyJwtToken(token);
    } catch (error) {
      console.error('Error parsing JWT token:', error);
      return null;
    }
  }

  // ==================== 认证相关方法 ====================

  /**
   * 密码哈希
   * @param password 明文密码
   * @returns 哈希后的密码
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * 密码验证
   * @param password 明文密码
   * @param hash 哈希密码
   * @returns 是否匹配
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * 生成 JWT Token
   * @param user 用户对象
   * @returns JWT Token
   */
  generateToken(user: AuthUser): string {
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
  async verifyToken(token: string): Promise<AuthUser | null> {
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
  async registerUser(username: string, password: string): Promise<{ user: AuthUser; token: string }> {
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
  async loginUser(username: string, password: string): Promise<{ user: AuthUser; token: string }> {
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
  async checkAuthStatus(token: string): Promise<{ isAuthenticated: boolean; user: AuthUser | null }> {
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
  async hasUsers(): Promise<boolean> {
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
