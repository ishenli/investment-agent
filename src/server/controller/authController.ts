import { z } from 'zod';
import { BaseBizController } from './base';
import { AuthService } from '../service/authService';
import logger from '../base/logger';

// 注册请求 Schema
const RegisterSchema = z.object({
  username: z
    .string()
    .min(3, '用户名至少 3 个字符')
    .max(30, '用户名最多 30 个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  password: z.string().min(6, '密码至少需要 6 个字符'),
});

// 登录请求 Schema
const LoginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

export class AuthController extends BaseBizController {
  /**
   * 用户注册
   */
  async register(username: string, password: string) {
    try {
      // 验证请求参数
      const params = await this.validateParams({ username, password }, RegisterSchema);

      // 调用服务层进行注册
      const { user, token } = await AuthService.registerUser(params.username, params.password);

      logger.info(`[AuthController] 用户注册成功: ${user.username}`);

      return this.success({
        user,
        token,
        message: '注册成功',
      });
    } catch (error) {
      logger.error('[AuthController] 用户注册失败:', error);

      if (error instanceof Error) {
        // 检查是否是用户名已存在的错误
        if (error.message === '用户名已存在') {
          return this.error(error.message, 'user_exists');
        }
      }

      return this.error('注册失败，请稍后重试', 'register_error');
    }
  }

  /**
   * 用户登录
   */
  async login(username: string, password: string) {
    try {
      // 验证请求参数
      const params = await this.validateParams({ username, password }, LoginSchema);

      // 调用服务层进行登录
      const { user, token } = await AuthService.loginUser(params.username, params.password);

      logger.info(`[AuthController] 用户登录成功: ${user.username}`);

      return this.success({
        user,
        token,
        message: '登录成功',
      });
    } catch (error) {
      logger.error('[AuthController] 用户登录失败:', error);

      if (error instanceof Error) {
        // 检查是否是用户名或密码错误的错误
        if (error.message === '用户名或密码错误') {
          return this.error(error.message, 'invalid_credentials');
        }
      }

      return this.error('登录失败，请稍后重试', 'login_error');
    }
  }

  /**
   * 检查认证状态
   */
  async checkAuth(token?: string) {
    try {
      if (!token) {
        return this.success({
          isAuthenticated: false,
          user: null,
        });
      }

      const { isAuthenticated, user } = await AuthService.checkAuthStatus(token);

      return this.success({
        isAuthenticated,
        user,
      });
    } catch (error) {
      logger.error('[AuthController] 检查认证状态失败:', error);
      return this.success({
        isAuthenticated: false,
        user: null,
      });
    }
  }

  /**
   * 检查用户是否存在（用于判断显示登录或注册表单）
   */
  async hasUsers() {
    try {
      const hasUsers = await AuthService.hasUsers();
      return this.success({
        hasUsers,
      });
    } catch (error) {
      logger.error('[AuthController] 检查用户是否存在失败:', error);
      return this.success({
        hasUsers: false,
      });
    }
  }
}