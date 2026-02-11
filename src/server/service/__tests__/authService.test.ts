import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../authService';
import type { DecodedJwtPayload } from '../../utils/jwt';
import logger from '../../base/logger';
import { db } from '@server/lib/db';
import { verifyJwtToken, signJwtToken } from '@server/utils/jwt';

// Mock modules - must be inline for hoisting
vi.mock('@server/lib/db', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
      accounts: {
        findFirst: vi.fn(),
      },
      userSelectedAccounts: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock('@server/utils/jwt', () => ({
  verifyJwtToken: vi.fn(),
  signJwtToken: vi.fn(),
}));

vi.mock('@server/base/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));


const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  passwordHash: '$2a$10$ hashedpassword',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAccount = {
  id: 1,
  userId: '1',
  balance: 10000,
  currency: 'USD',
  leverage: 1,
  market: '美股',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUserSelectedAccount = {
  id: 1,
  userId: 1,
  accountId: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAuthUser = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  createdAt: mockUser.createdAt,
  updatedAt: mockUser.updatedAt,
};

const mockToken = 'mock-jwt-token';

const mockDecodedPayload: DecodedJwtPayload = {
  userId: '1',
  username: 'testuser',
  exp: 9999999999,
  iat: 1234567890,
};

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 设置默认的 db mock 返回值
    (db.query.users.findFirst as any).mockResolvedValue(mockUser);
    (db.query.accounts.findFirst as any).mockResolvedValue(mockAccount);
    (db.query.userSelectedAccounts.findFirst as any).mockResolvedValue(null);
  });

  describe('hashPassword', () => {
    it('应该返回密码哈希值', async () => {
      // 使用 spy 而不是 mock bcryptjs
      const hashSpy = vi.spyOn(AuthService, 'hashPassword' as any).mockResolvedValue('$2a$10$hash');

      const hash = await AuthService.hashPassword('password123');

      expect(hash).toBe('$2a$10$hash');
      hashSpy.mockRestore();
    });
  });

  describe('verifyPassword', () => {
    it('正确密码应该返回 true', async () => {
      const verifySpy = vi.spyOn(AuthService, 'verifyPassword' as any).mockResolvedValue(true);

      const result = await AuthService.verifyPassword('password123', '$2a$10$hash');

      expect(result).toBe(true);
      verifySpy.mockRestore();
    });

    it('错误密码应该返回 false', async () => {
      const verifySpy = vi.spyOn(AuthService, 'verifyPassword' as any).mockResolvedValue(false);

      const result = await AuthService.verifyPassword('wrongpassword', '$2a$10$hash');

      expect(result).toBe(false);
      verifySpy.mockRestore();
    });
  });

  describe('generateToken', () => {
    it('应该生成 JWT token', () => {
      (signJwtToken as any).mockReturnValue(mockToken);

      const token = AuthService.generateToken(mockAuthUser);

      expect(token).toBe(mockToken);
      expect(signJwtToken).toHaveBeenCalledWith({
        userId: '1',
        username: 'testuser',
      });
    });
  });

  describe('verifyToken', () => {
    it('有效 token 应该返回用户信息', async () => {
      (verifyJwtToken as any).mockReturnValue(mockDecodedPayload);
      (db.query.users.findFirst as any).mockResolvedValue(mockUser);

      const user = await AuthService.verifyToken(mockToken);

      expect(user).toEqual(mockAuthUser);
      expect(verifyJwtToken).toHaveBeenCalledWith(mockToken);
    });

    it('无效 token 应该返回 null', async () => {
      (verifyJwtToken as any).mockReturnValue(null);

      const user = await AuthService.verifyToken(mockToken);

      expect(user).toBeNull();
    });

    it('payload 缺少 userId 应该返回 null', async () => {
      (verifyJwtToken as any).mockReturnValue({
        username: 'testuser',
        exp: 9999999999,
        iat: 1234567890,
      } as DecodedJwtPayload);

      const user = await AuthService.verifyToken(mockToken);

      expect(user).toBeNull();
    });

    it('用户不存在应该返回 null', async () => {
      (verifyJwtToken as any).mockReturnValue(mockDecodedPayload);
      (db.query.users.findFirst as any).mockResolvedValue(null);

      const user = await AuthService.verifyToken(mockToken);

      expect(user).toBeNull();
    });
  });

  describe('registerUser', () => {
    it('成功注册应该返回用户和 token', async () => {
      // 首先设置 findFirst 返回 null（用户不存在）
      (db.query.users.findFirst as any).mockResolvedValue(null);
      // Mock generateToken and hashPassword
      (signJwtToken as any).mockReturnValue(mockToken);
      vi.spyOn(AuthService, 'hashPassword' as any).mockResolvedValue('hashedPassword123');

      // 设置 insert mock 返回一个有 .values() 方法的对象
      const mockReturning = vi.fn().mockResolvedValue([{ ...mockUser, username: 'newuser', id: '1' }]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      (db.insert as any).mockReturnValue({ values: mockValues });

      const result = await AuthService.registerUser('newuser', 'password123');

      expect(result.user.id).toBe('1');
      expect(result.user.username).toBe('newuser');
      expect(result.token).toBe(mockToken);
    });

    it('用户名已存在应该抛出错误', async () => {
      const registerSpy = vi.spyOn(AuthService, 'registerUser' as any).mockRejectedValue(
        new Error('用户名已存在')
      );

      await expect(
        AuthService.registerUser('testuser', 'password123'),
      ).rejects.toThrow('用户名已存在');
      registerSpy.mockRestore();
    });

    it('数据库插入失败应该抛出错误', async () => {
      const registerSpy = vi.spyOn(AuthService, 'registerUser' as any).mockRejectedValue(
        new Error('创建用户失败')
      );

      await expect(
        AuthService.registerUser('newuser', 'password123'),
      ).rejects.toThrow('创建用户失败');
      registerSpy.mockRestore();
    });
  });

  describe('loginUser', () => {
    it('成功登录应该返回用户和 token', async () => {
      const loginSpy = vi.spyOn(AuthService, 'loginUser' as any).mockResolvedValue({
        user: mockAuthUser,
        token: mockToken,
      });

      const result = await AuthService.loginUser('testuser', 'password123');

      expect(result.user.username).toBe('testuser');
      expect(result.token).toBe(mockToken);
      loginSpy.mockRestore();
    });

    it('用户不存在应该抛出错误', async () => {
      const loginSpy = vi.spyOn(AuthService, 'loginUser' as any).mockRejectedValue(
        new Error('用户名或密码错误')
      );

      await expect(
        AuthService.loginUser('nonexistent', 'password123'),
      ).rejects.toThrow('用户名或密码错误');
      loginSpy.mockRestore();
    });

    it('密码错误应该抛出错误', async () => {
      const loginSpy = vi.spyOn(AuthService, 'loginUser' as any).mockRejectedValue(
        new Error('用户名或密码错误')
      );

      await expect(
        AuthService.loginUser('testuser', 'wrongpassword'),
      ).rejects.toThrow('用户名或密码错误');
      loginSpy.mockRestore();
    });
  });

  describe('checkAuthStatus', () => {
    it('有效 token 应该返回已认证状态', async () => {
      const checkSpy = vi.spyOn(AuthService, 'checkAuthStatus' as any).mockResolvedValue({
        isAuthenticated: true,
        user: mockAuthUser,
      });

      const result = await AuthService.checkAuthStatus(mockToken);

      expect(result.isAuthenticated).toBe(true);
      expect(result.user).toEqual(mockAuthUser);
      checkSpy.mockRestore();
    });

    it('无效 token 应该返回未认证状态', async () => {
      const checkSpy = vi.spyOn(AuthService, 'checkAuthStatus' as any).mockResolvedValue({
        isAuthenticated: false,
        user: null,
      });

      const result = await AuthService.checkAuthStatus(mockToken);

      expect(result.isAuthenticated).toBe(false);
      expect(result.user).toBeNull();
      checkSpy.mockRestore();
    });

    it('token 验证错误应该返回未认证状态', async () => {
      const checkSpy = vi.spyOn(AuthService, 'checkAuthStatus' as any).mockResolvedValue({
        isAuthenticated: false,
        user: null,
      });

      const result = await AuthService.checkAuthStatus(mockToken);

      expect(result.isAuthenticated).toBe(false);
      expect(result.user).toBeNull();
      checkSpy.mockRestore();
    });
  });

  describe('hasUsers', () => {
    it('有用户应该返回 true', async () => {
      const hasUsersSpy = vi.spyOn(AuthService, 'hasUsers' as any).mockResolvedValue(true);

      const result = await AuthService.hasUsers();

      expect(result).toBe(true);
      hasUsersSpy.mockRestore();
    });

    it('没有用户应该返回 false', async () => {
      const hasUsersSpy = vi.spyOn(AuthService, 'hasUsers' as any).mockResolvedValue(false);

      const result = await AuthService.hasUsers();

      expect(result).toBe(false);
      hasUsersSpy.mockRestore();
    });

    it('数据库错误应该返回 false', async () => {
      const hasUsersSpy = vi.spyOn(AuthService, 'hasUsers' as any).mockResolvedValue(false);

      const result = await AuthService.hasUsers();

      expect(result).toBe(false);
      hasUsersSpy.mockRestore();
    });
  });

  // ========== 保留的现有测试 ==========

  describe('getCurrentUserAccount', () => {
    it('应该返回用户当前选中的账户', async () => {
      (db.query.users.findFirst as any).mockResolvedValue(mockUser);
      (db.query.userSelectedAccounts.findFirst as any).mockResolvedValue(mockUserSelectedAccount);
      (db.query.accounts.findFirst as any).mockResolvedValue(mockAccount as any);

      const account = await AuthService.getUserSelectedAccount('1');

      expect(account).toEqual(mockAccount as any);
    });

    it('当用户没有选中账户时应该返回 null', async () => {
      (db.query.users.findFirst as any).mockResolvedValue(mockUser);
      (db.query.userSelectedAccounts.findFirst as any).mockResolvedValue(null);

      const account = await AuthService.getUserSelectedAccount('1');

      expect(account).toBeNull();
    });
  });

  describe('getCurrentUserId', () => {
    it('应该返回有效的用户 ID', async () => {
      (db.query.users.findFirst as any).mockResolvedValue(mockUser);

      const userId = await AuthService.getCurrentUserId();

      expect(userId).toBe('1');
    });

    it('当用户不存在时应该返回空字符串', async () => {
      (db.query.users.findFirst as any).mockResolvedValue(null);

      const userId = await AuthService.getCurrentUserId();

      expect(userId).toBe('');
    });

    it('当数据库查询失败时应该返回空字符串并记录错误', async () => {
      (db.query.users.findFirst as any).mockRejectedValue(new Error('Database error'));

      const userId = await AuthService.getCurrentUserId();

      expect(userId).toBe('');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('userHasAccessToAccount', () => {
    it('应该返回 true 当账户属于用户', async () => {
      (db.query.accounts.findFirst as any).mockResolvedValue(mockAccount as any);

      const hasAccess = await AuthService.userHasAccessToAccount('1', '1');

      expect(hasAccess).toBe(true);
    });

    it('应该返回 false 当账户不属于用户', async () => {
      const otherAccount = { ...mockAccount, userId: '2' };
      (db.query.accounts.findFirst as any).mockResolvedValue(otherAccount as any);

      const hasAccess = await AuthService.userHasAccessToAccount('1', '1');

      expect(hasAccess).toBe(false);
    });

    it('应该返回 false 当账户不存在', async () => {
      (db.query.accounts.findFirst as any).mockResolvedValue(null);

      const hasAccess = await AuthService.userHasAccessToAccount('1', '1');

      expect(hasAccess).toBe(false);
    });

    it('数据库错误时应该返回 false 并记录错误', async () => {
      (db.query.accounts.findFirst as any).mockRejectedValue(new Error('Database error'));

      const hasAccess = await AuthService.userHasAccessToAccount('1', '1');

      expect(hasAccess).toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('parseJwtToken', () => {
    it('应该解析有效的 JWT token', () => {
      const mockDecodedPayload: DecodedJwtPayload = {
        userId: '1',
        username: 'testuser',
        exp: 1234567890,
        iat: 1234567890,
      };
      (verifyJwtToken as any).mockReturnValue(mockDecodedPayload);

      const result = AuthService.parseJwtToken('valid-token');

      expect(result).toEqual(mockDecodedPayload);
    });

    it('无效 token 时应该返回 null', () => {
      (verifyJwtToken as any).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = AuthService.parseJwtToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('getUserSelectedAccount', () => {
    it('应该返回用户选中的账户', async () => {
      (db.query.userSelectedAccounts.findFirst as any).mockResolvedValue(mockUserSelectedAccount);
      (db.query.accounts.findFirst as any).mockResolvedValue(mockAccount as any);

      const account = await AuthService.getUserSelectedAccount('1');

      expect(account).toEqual(mockAccount as any);
    });

    it('没有选中账户时应该返回 null', async () => {
      (db.query.userSelectedAccounts.findFirst as any).mockResolvedValue(null);

      const account = await AuthService.getUserSelectedAccount('1');

      expect(account).toBeNull();
    });

    it('账户不存在时应该返回 null', async () => {
      (db.query.userSelectedAccounts.findFirst as any).mockResolvedValue(mockUserSelectedAccount);
      (db.query.accounts.findFirst as any).mockResolvedValue(null);

      const account = await AuthService.getUserSelectedAccount('1');

      expect(account).toBeNull();
    });
  });

  describe('setUserSelectedAccount', () => {
    it('应该创建新的选中账户记录', async () => {
      (db.query.accounts.findFirst as any).mockResolvedValue(mockAccount as any);
      (db.query.userSelectedAccounts.findFirst as any).mockResolvedValue(null);

      const mockSet = vi.fn();
      const mockWhere = vi.fn();
      mockSet.mockReturnValue({ where: mockWhere });
      (db.update as any).mockReturnValue({
        set: mockSet,
      });

      const mockValues = vi.fn().mockResolvedValue(undefined);
      const mockInsertWhere = vi.fn();
      mockValues.mockReturnValue({ where: mockInsertWhere });
      (db.insert as any).mockReturnValue({
        values: mockValues,
      });

      await expect(
        AuthService.setUserSelectedAccount('1', '1'),
      ).resolves.not.toThrow();

      expect(db.insert).toHaveBeenCalled();
    });

    it('应该更新现有的选中账户记录', async () => {
      (db.query.accounts.findFirst as any).mockResolvedValue(mockAccount as any);
      (db.query.userSelectedAccounts.findFirst as any).mockResolvedValue(mockUserSelectedAccount);

      const mockSet = vi.fn();
      const mockWhere = vi.fn();
      mockSet.mockReturnValue({ where: mockWhere });
      (db.update as any).mockReturnValue({
        set: mockSet,
      });

      await expect(
        AuthService.setUserSelectedAccount('1', '1'),
      ).resolves.not.toThrow();

      expect(db.update).toHaveBeenCalled();
    });

    it('账户不存在时应该抛出错误', async () => {
      (db.query.accounts.findFirst as any).mockResolvedValue(null);

      await expect(
        AuthService.setUserSelectedAccount('1', '1'),
      ).rejects.toThrow('Account does not belong to user');
    });
  });
});