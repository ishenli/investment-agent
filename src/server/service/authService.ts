import { db } from '@server/lib/db';
import { users, accountFunds, userSelectedAccounts, accounts } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { verifyJwtToken } from '@server/utils/jwt';
import logger from '../base/logger';
import { AccountType } from '@/types';

// 定义JWT payload类型
export interface JwtPayload {
  userId: string;
  exp?: number;
  iat?: number;
  [key: string]: string | number | boolean | object | null | undefined;
}

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
}

const authService = new AuthService();
export default authService;
