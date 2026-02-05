import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService, JwtPayload } from '../authService';
import logger from '@server/base/logger';

// Mock drizzle-orm in setup - already done in tests/setup.ts

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

vi.mock('@/server/utils/jwt', () => ({
  verifyJwtToken: vi.fn(),
}));

vi.mock('@server/base/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { db } from '@server/lib/db';
import { verifyJwtToken } from '@/server/utils/jwt';

const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
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

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
      const mockPayload: JwtPayload = { userId: '1', exp: 1234567890 };
      (verifyJwtToken as any).mockReturnValue(mockPayload);

      const result = AuthService.parseJwtToken('valid-token');

      expect(result).toEqual(mockPayload);
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