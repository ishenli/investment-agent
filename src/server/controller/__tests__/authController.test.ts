import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../service/authService';
import { AuthController } from '../authController';

// Mock decorators before importing the controller
vi.mock('@server/base/decorators', () => ({
  WithRequestContext:
    () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;
      descriptor.value = async function (this: any, ...args: any[]) {
        return await originalMethod.apply(this, args);
      };
      return descriptor;
    },
  WithRequestContextStatic:
    () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;
      descriptor.value = async function (this: any, ...args: any[]) {
        return await originalMethod.apply(this, args);
      };
      return descriptor;
    },
  runWithRequestContext: async (fn: () => Promise<any>) => await fn(),
}));

const mockUser = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockToken = 'test-jwt-token';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(() => {
    controller = new AuthController();
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('成功注册应该返回用户信息和 token', async () => {
      vi.spyOn(AuthService, 'registerUser').mockResolvedValue({
        user: mockUser,
        token: mockToken,
      });

      const result = await controller.register('testuser', 'password123');

      expect(result.success).toBe(true);
      expect(result.data?.user).toEqual(mockUser);
      expect(result.data?.token).toBe(mockToken);
      expect(result.data?.message).toBe('注册成功');
    });

    it('用户名已存在应该返回错误', async () => {
      vi.spyOn(AuthService, 'registerUser').mockRejectedValue(
        new Error('用户名已存在')
      );

      const result = await controller.register('existinguser', 'password123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('用户名已存在');
      expect(result.code).toBe('user_exists');
    });

    it('用户名格式验证失败应该返回错误', async () => {
      controller.register('ab', 'password123').catch((e) => {
        expect(e).toBeDefined();
      });
    });

    it('密码过短应该返回错误', async () => {
      controller.register('testuser', '12345').catch((e) => {
        expect(e).toBeDefined();
      });
    });

    it('用户名包含非法字符应该返回错误', async () => {
      controller.register('test user', 'password123').catch((e) => {
        expect(e).toBeDefined();
      });
    });

    it('服务层抛出未知错误应该返回通用错误', async () => {
      vi.spyOn(AuthService, 'registerUser').mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await controller.register('testuser', 'password123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('注册失败，请稍后重试');
      expect(result.code).toBe('register_error');
    });
  });

  describe('login', () => {
    it('成功登录应该返回用户信息和 token', async () => {
      vi.spyOn(AuthService, 'loginUser').mockResolvedValue({
        user: mockUser,
        token: mockToken,
      });

      const result = await controller.login('testuser', 'password123');

      expect(result.success).toBe(true);
      expect(result.data?.user).toEqual(mockUser);
      expect(result.data?.token).toBe(mockToken);
      expect(result.data?.message).toBe('登录成功');
    });

    it('用户名或密码错误应该返回错误', async () => {
      vi.spyOn(AuthService, 'loginUser').mockRejectedValue(
        new Error('用户名或密码错误')
      );

      const result = await controller.login('wronguser', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.message).toBe('用户名或密码错误');
      expect(result.code).toBe('invalid_credentials');
    });

    it('空用户名应该返回验证错误', async () => {
      controller.login('', 'password123').catch((e) => {
        expect(e).toBeDefined();
      });
    });

    it('空密码应该返回验证错误', async () => {
      controller.login('testuser', '').catch((e) => {
        expect(e).toBeDefined();
      });
    });

    it('服务层抛出未知错误应该返回通用错误', async () => {
      vi.spyOn(AuthService, 'loginUser').mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await controller.login('testuser', 'password123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('登录失败，请稍后重试');
      expect(result.code).toBe('login_error');
    });
  });

  describe('checkAuth', () => {
    it('有效 token 应该返回已认证状态和用户信息', async () => {
      vi.spyOn(AuthService, 'checkAuthStatus').mockResolvedValue({
        isAuthenticated: true,
        user: mockUser,
      });

      const result = await controller.checkAuth(mockToken);

      expect(result.success).toBe(true);
      expect(result.data?.isAuthenticated).toBe(true);
      expect(result.data?.user).toEqual(mockUser);
    });

    it('无效 token 应该返回未认证状态', async () => {
      vi.spyOn(AuthService, 'checkAuthStatus').mockResolvedValue({
        isAuthenticated: false,
        user: null,
      });

      const result = await controller.checkAuth('invalid-token');

      expect(result.success).toBe(true);
      expect(result.data?.isAuthenticated).toBe(false);
      expect(result.data?.user).toBeNull();
    });

    it('无 token 应该返回未认证状态', async () => {
      const result = await controller.checkAuth(undefined);

      expect(result.success).toBe(true);
      expect(result.data?.isAuthenticated).toBe(false);
      expect(result.data?.user).toBeNull();
    });

    it('服务层抛出错误应该返回未认证状态', async () => {
      vi.spyOn(AuthService, 'checkAuthStatus').mockRejectedValue(
        new Error('Token validation failed')
      );

      const result = await controller.checkAuth(mockToken);

      expect(result.success).toBe(true);
      expect(result.data?.isAuthenticated).toBe(false);
      expect(result.data?.user).toBeNull();
    });
  });

  describe('hasUsers', () => {
    it('有用户存在时应该返回 true', async () => {
      vi.spyOn(AuthService, 'hasUsers').mockResolvedValue(true);

      const result = await controller.hasUsers();

      expect(result.success).toBe(true);
      expect(result.data?.hasUsers).toBe(true);
    });

    it('没有用户时应该返回 false', async () => {
      vi.spyOn(AuthService, 'hasUsers').mockResolvedValue(false);

      const result = await controller.hasUsers();

      expect(result.success).toBe(true);
      expect(result.data?.hasUsers).toBe(false);
    });

    it('服务层抛出错误应该返回 false', async () => {
      vi.spyOn(AuthService, 'hasUsers').mockRejectedValue(
        new Error('Database error')
      );

      const result = await controller.hasUsers();

      expect(result.success).toBe(true);
      expect(result.data?.hasUsers).toBe(false);
    });
  });
});