import { describe, it, expect, vi, beforeEach } from 'vitest';
import accountService, { AccountService } from '../accountService';

// Logger mock is in tests/setup.ts
vi.mock('@server/lib/db', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      accounts: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      accountFunds: {
        findFirst: vi.fn(),
      },
      transactions: {
        insert: vi.fn(),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(),
    })),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
    execute: vi.fn(),
  },
}));

vi.mock('@/shared', () => ({
  validateWithFormat: vi.fn(),
}));

import { db } from '@server/lib/db';
import { validateWithFormat } from '@/shared';

const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAccount = {
  id: 1,
  userId: 1,
  accountName: 'testuser的账户',
  market: 'US',
  currency: 'USD',
  leverage: 1,
  riskMode: 'retail',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTradingAccount = {
  id: '1',
  userId: '1',
  accountName: 'testuser的账户',
  balance: 10000,
  currency: 'USD',
  leverage: 1,
  market: 'US',
  riskMode: 'retail',
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true,
};

describe('AccountService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTradingAccount', () => {
    it('应该返回完整的交易账户信息', async () => {
      const mockAccountFund = {
        id: 1,
        accountId: 1,
        amountCents: 1000000,
        currency: 'USD',
        leverage: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (db.query.accounts.findFirst as any).mockResolvedValue(mockAccount as any);
      (db.query.accountFunds.findFirst as any).mockResolvedValue(mockAccountFund);
      (db.query.users.findFirst as any).mockResolvedValue(mockUser);

      const result = await accountService.getTradingAccount('1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('1');
      expect(result?.userId).toBe('1');
      expect(result?.accountName).toBe('testuser的账户');
      expect(result?.balance).toBe(10000);
      expect(result?.currency).toBe('USD');
      expect(result?.leverage).toBe(1);
      expect(result?.market).toBe('US');
    });

    it('账户不存在时应该返回 null', async () => {
      (db.query.accounts.findFirst as any).mockResolvedValue(null);

      const result = await accountService.getTradingAccount('999');

      expect(result).toBeNull();
    });

    it('数据库错误时应该返回 null', async () => {
      (db.query.accounts.findFirst as any).mockRejectedValue(new Error('Database error'));

      const result = await accountService.getTradingAccount('1');

      expect(result).toBeNull();
    });

    it('没有账户资金记录时应该使用默认值', async () => {
      (db.query.accounts.findFirst as any).mockResolvedValue(mockAccount as any);
      (db.query.accountFunds.findFirst as any).mockResolvedValue(null);
      (db.query.users.findFirst as any).mockResolvedValue(mockUser);

      const result = await accountService.getTradingAccount('1');

      expect(result).not.toBeNull();
      expect(result?.balance).toBe(0);
      expect(result?.currency).toBe('USD');
    });
  });

  describe('getAllTradingAccounts', () => {
    it('应该返回分页的账户列表', async () => {
      const mockAccounts = [
        mockAccount as any,
        { ...mockAccount, id: 2, accountName: 'Account 2' },
      ];
      const mockAccountFund = {
        id: 1,
        accountId: 1,
        amountCents: 1000000,
        currency: 'USD',
        leverage: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (db.query.accounts.findMany as any).mockResolvedValue(
        mockAccounts.map((acc) => ({
          ...acc,
          market: 'US',
        })),
      );

      // Mock db.select().from() chain
      const mockFrom = vi.fn().mockResolvedValue([{ count: 2 }]);
      (db.select as any).mockReturnValue({ from: mockFrom });

      (db.query.accountFunds.findFirst as any).mockResolvedValue(mockAccountFund);
      (db.query.users.findFirst as any).mockResolvedValue(mockUser);

      const result = await accountService.getAllTradingAccounts(10, 0);

      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(2);
    });

    it('应该正确处理空数据', async () => {
      (db.query.accounts.findMany as any).mockResolvedValue([]);

      // Mock db.select().from() chain
      const mockFrom = vi.fn().mockResolvedValue([{ count: 0 }]);
      (db.select as any).mockReturnValue({ from: mockFrom });

      const result = await accountService.getAllTradingAccounts();

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('数据库错误时应该返回空列表', async () => {
      (db.query.accounts.findMany as any).mockRejectedValue(new Error('Database error'));

      // Mock db.select().from() chain
      const mockFrom = vi.fn().mockResolvedValue([{ count: 0 }]);
      (db.select as any).mockReturnValue({ from: mockFrom });

      const result = await accountService.getAllTradingAccounts();

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('createTradingAccount', () => {
    it('应该成功创建新的交易账户', async () => {
      // Mock validateWithFormat to return the input data
      (validateWithFormat as any).mockImplementation((_: any, data: any) => ({
        success: true,
        data,
      }));
      (db.query.users.findFirst as any).mockResolvedValue(mockUser);

      const newAccount = {
        id: 1,
        userId: 1,
        accountName: 'Test Account',
        market: 'US',
        currency: 'USD',
        leverage: 1,
        riskMode: 'retail',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockInsert = vi.fn().mockResolvedValue([newAccount]);
      const mockValues = vi.fn().mockReturnValue({
        returning: mockInsert,
      });
      (db.insert as any).mockReturnValue({
        values: mockValues,
      });

      // @ts-ignore
      (db.query.transactions.insert as any).mockResolvedValue(undefined);

      const result = await accountService.createTradingAccount({
        userId: '1',
        market: 'US',
        leverage: 1,
        initialDeposit: 0,
      });

      expect(result).not.toBeNull();
      expect(result.id).toBe('1');
      expect(result.userId).toBe('1');
      expect(result.market).toBe('US');
    });

    it('用户不存在时应该抛出错误', async () => {
      (validateWithFormat as any).mockReturnValue({ success: true, data: {} });
      (db.query.users.findFirst as any).mockResolvedValue(null);

      await expect(
        accountService.createTradingAccount({
          userId: '999',
          market: 'US',
          leverage: 1,
          initialDeposit: 0,
        }),
      ).rejects.toThrow('User not found');
    });
  });

  describe('updateTradingAccount', () => {
    it('应该成功更新交易账户', async () => {
      (validateWithFormat as any).mockImplementation((_: any, data: any) => ({
        success: true,
        data,
      }));

      const updatedAccountFund = {
        id: 1,
        accountId: 1,
        amountCents: 600000,
        currency: 'USD',
        leverage: 2,
        updatedAt: new Date(),
      };

      const mockReturning = vi.fn().mockResolvedValue([updatedAccountFund]);
      const mockWhere = vi.fn().mockReturnValue({
        returning: mockReturning,
      });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db.update as any).mockReturnValue({
        set: mockSet,
      });

      const updatedAccount = { ...mockTradingAccount, leverage: 2 };
      vi.spyOn(accountService, 'getTradingAccount').mockResolvedValue(updatedAccount as any);

      const result = await accountService.updateTradingAccount('1', {
        market: 'US',
        leverage: 2,
      });

      expect(result).not.toBeNull();
      expect(result?.leverage).toBe(2);
    });

    it('账户不存在时应该返回 null', async () => {
      (validateWithFormat as any).mockReturnValue({ success: true, data: {} });
      vi.spyOn(accountService, 'getTradingAccount').mockResolvedValue(null);

      const result = await accountService.updateTradingAccount('999', {
        market: 'US',
        leverage: 1,
      });

      expect(result).toBeNull();
    });

    it('验证失败时应该抛出错误', async () => {
      (validateWithFormat as any).mockReturnValue({
        success: false,
        errors: ['Invalid market value'],
      });

      await expect(
        accountService.updateTradingAccount('1', {
          market: undefined,
          leverage: 1,
        }),
      ).rejects.toThrow();
    });
  });

  describe('createAccount', () => {
    it('验证失败时应该抛出错误', async () => {
      (validateWithFormat as any).mockReturnValue({
        success: false,
        errors: ['Invalid email format'],
      });

      await expect(
        accountService.createAccount({
          username: 'testuser',
          email: 'invalid-email',
          password: 'password123',
          market: 'US',
          leverage: 1,
          initialDeposit: 0,
        }),
      ).rejects.toThrow();
    });
  });

  describe('getUserAccount', () => {
    it('应该返回用户账户信息', async () => {
      (db.query.users.findFirst as any).mockResolvedValue(mockUser);

      const result = await accountService.getUserAccount('1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('1');
      expect(result?.username).toBe('testuser');
      expect(result?.email).toBe('test@example.com');
    });

    it('用户不存在时应该返回 null', async () => {
      (db.query.users.findFirst as any).mockResolvedValue(null);

      const result = await accountService.getUserAccount('999');

      expect(result).toBeNull();
    });
  });

  describe('updateAccountBalance', () => {
    it('账户不存在时应该返回 null', async () => {
      vi.spyOn(accountService, 'getTradingAccount').mockResolvedValue(null);

      const result = await accountService.updateAccountBalance('999', 10000);

      expect(result).toBeNull();
    });
  });

  describe('getAllAccounts', () => {
    it('应该返回所有账户', async () => {
      (db.query.accounts.findMany as any).mockResolvedValue([
        mockAccount as any,
        { ...mockAccount, id: 2 },
      ]);

      const result = await accountService.getAllAccounts();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    it('无数据时应该返回空数组', async () => {
      (db.query.accounts.findMany as any).mockResolvedValue([]);

      const result = await accountService.getAllAccounts();

      expect(result).toHaveLength(0);
    });
  });
});
