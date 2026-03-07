/* eslint-disable @typescript-eslint/ban-ts-comment */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import accountService, { AccountService } from '../accountService';
import { validateWithFormat } from '@/shared';
import { userRepository } from '@server/repository/userRepository';
import { accountRepository } from '@server/repository/accountRepository';
import { accountFundRepository } from '@server/repository/accountFundRepository';
import { userSelectedAccountRepository } from '@server/repository/userSelectedAccountRepository';
import { accountCombinedRepository } from '@server/repository/accountCombinedRepository';

// Mock repositories
vi.mock('@server/repository/userRepository', () => ({
  userRepository: {
    findById: vi.fn(),
    findByUsername: vi.fn(),
    findByEmail: vi.fn(),
    createUser: vi.fn(),
  },
}));

vi.mock('@server/repository/accountRepository', () => ({
  accountRepository: {
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findByIdAndUserId: vi.fn(),
    verifyOwnership: vi.fn(),
    countByUserId: vi.fn(),
    findByUserIdPaginated: vi.fn(),
    findAll: vi.fn(),
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
    softDelete: vi.fn(),
  },
}));

vi.mock('@server/repository/accountFundRepository', () => ({
  accountFundRepository: {
    findByAccountId: vi.fn(),
    findByAccountIds: vi.fn(),
    updateBalance: vi.fn(),
    createAccountFund: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@server/repository/userSelectedAccountRepository', () => ({
  userSelectedAccountRepository: {
    findByUserId: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock('@server/repository/accountCombinedRepository', () => ({
  accountCombinedRepository: {
    findTradingAccountById: vi.fn(),
    findTradingAccountsByUserId: vi.fn(),
    verifyAccountOwnership: vi.fn(),
  },
}));

vi.mock('@/shared', () => ({
  validateWithFormat: vi.fn(),
}));

vi.mock('@server/lib/db', () => ({
  db: {
    insert: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock('@server/base/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../authService', () => ({
  default: {
    getDefaultUserId: vi.fn(),
  },
}));

import authService from '../authService';


const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  passwordHash: 'hashed_password',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
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
  deletedAt: null,
};

const mockAccountFund = {
  id: 1,
  accountId: 1,
  amountCents: 1000000,
  currency: 'USD',
  leverage: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTradingAccountDetail = {
  account: mockAccount,
  fund: mockAccountFund,
  user: { username: 'testuser' },
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
};

const mockUserSelectedAccount = {
  id: 1,
  userId: 1,
  accountId: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AccountService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTradingAccount', () => {
    it('应该返回完整的交易账户信息', async () => {
      (accountCombinedRepository.findTradingAccountById as any).mockResolvedValue(mockTradingAccountDetail);

      const result = await accountService.getTradingAccount('1', '1');

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
      (authService.getDefaultUserId as any).mockResolvedValue('999');
      (accountCombinedRepository.findTradingAccountById as any).mockResolvedValue(null);

      const result = await accountService.getTradingAccount('999');

      expect(result).toBeNull();
    });

    it('数据库错误时应该返回 null', async () => {
      (authService.getDefaultUserId as any).mockResolvedValue('1');
      (accountCombinedRepository.findTradingAccountById as any).mockRejectedValue(new Error('Database error'));

      const result = await accountService.getTradingAccount('1');

      expect(result).toBeNull();
    });

    it('没有账户资金记录时应该使用默认值', async () => {
      const detailWithoutFund = {
        account: mockAccount,
        fund: null,
        user: { username: 'testuser' },
      };
      (authService.getDefaultUserId as any).mockResolvedValue('1');
      (accountCombinedRepository.findTradingAccountById as any).mockResolvedValue(detailWithoutFund);

      const result = await accountService.getTradingAccount('1');

      expect(result).not.toBeNull();
      expect(result?.balance).toBe(0);
      expect(result?.currency).toBe('USD');
    });
  });

  describe('getAllTradingAccounts', () => {
    it('应该返回分页的账户列表', async () => {
      const mockPaginatedResult = {
        items: [mockTradingAccountDetail],
        totalCount: 1,
      };
      (accountCombinedRepository.findTradingAccountsByUserId as any).mockResolvedValue(mockPaginatedResult);

      const result = await accountService.getAllTradingAccounts('1', 10, 0);

      expect(result.items).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.items[0].id).toBe('1');
    });

    it('应该正确处理空数据', async () => {
      (accountCombinedRepository.findTradingAccountsByUserId as any).mockResolvedValue({
        items: [],
        totalCount: 0,
      });

      const result = await accountService.getAllTradingAccounts('1');

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('数据库错误时应该返回空列表', async () => {
      (accountCombinedRepository.findTradingAccountsByUserId as any).mockRejectedValue(new Error('Database error'));

      const result = await accountService.getAllTradingAccounts('1');

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('createTradingAccount', () => {
    it('应该成功创建新的交易账户', async () => {
      (validateWithFormat as any).mockImplementation((_: any, data: any) => ({
        success: true,
        data,
      }));
      (userRepository.findById as any).mockResolvedValue(mockUser);
      (accountRepository.createAccount as any).mockResolvedValue(mockAccount);
      (accountFundRepository.createAccountFund as any).mockResolvedValue(mockAccountFund);

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
      (validateWithFormat as any).mockReturnValue({ success: true, data: { userId: '999' } });
      (userRepository.findById as any).mockResolvedValue(null);

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
      (accountCombinedRepository.findTradingAccountById as any)
        .mockResolvedValueOnce(mockTradingAccountDetail)
        .mockResolvedValueOnce({ ...mockTradingAccountDetail, account: { ...mockAccount, leverage: 2 } });
      (accountRepository.updateAccount as any).mockResolvedValue({ ...mockAccount, leverage: 2 });
      (accountFundRepository.findByAccountId as any).mockResolvedValue(mockAccountFund);
      (accountFundRepository.update as any).mockResolvedValue(mockAccountFund);

      const result = await accountService.updateTradingAccount('1', '1', {
        market: 'US',
        leverage: 2,
      });

      expect(result).not.toBeNull();
    });

    it('账户不存在时应该返回 null', async () => {
      (validateWithFormat as any).mockReturnValue({ success: true, data: {} });
      (accountCombinedRepository.findTradingAccountById as any).mockResolvedValue(null);

      const result = await accountService.updateTradingAccount('999', '1', {
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
        accountService.updateTradingAccount('1', '1', {
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
      (userRepository.findById as any).mockResolvedValue(mockUser);

      const result = await accountService.getUserAccount('1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('1');
      expect(result?.username).toBe('testuser');
      expect(result?.email).toBe('test@example.com');
    });

    it('用户不存在时应该返回 null', async () => {
      (userRepository.findById as any).mockResolvedValue(null);

      const result = await accountService.getUserAccount('999');

      expect(result).toBeNull();
    });
  });

  describe('updateAccountBalance', () => {
    it('账户不存在时应该返回 null', async () => {
      (accountCombinedRepository.findTradingAccountById as any).mockResolvedValue(null);

      const result = await accountService.updateAccountBalance('999', '1', 10000);

      expect(result).toBeNull();
    });
  });

  describe('getAllAccounts', () => {
    it('应该返回所有账户', async () => {
      (accountRepository.findAll as any).mockResolvedValue([
        mockAccount,
        { ...mockAccount, id: 2 },
      ]);

      const result = await accountService.getAllAccounts();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    it('无数据时应该返回空数组', async () => {
      (accountRepository.findAll as any).mockResolvedValue([]);

      const result = await accountService.getAllAccounts();

      expect(result).toHaveLength(0);
    });
  });

  describe('getUserSelectedAccount', () => {
    it('应该返回用户当前选中的账户', async () => {
      (userSelectedAccountRepository.findByUserId as any).mockResolvedValue(mockUserSelectedAccount);
      (accountRepository.findById as any).mockResolvedValue(mockAccount);

      const account = await accountService.getUserSelectedAccount('1');

      expect(account).not.toBeNull();
    });

    it('当用户没有选中账户时应该返回 null', async () => {
      (userSelectedAccountRepository.findByUserId as any).mockResolvedValue(null);

      const account = await accountService.getUserSelectedAccount('1');

      expect(account).toBeNull();
    });
  });

  describe('setUserSelectedAccount', () => {
    it('应该成功设置用户选中的账户', async () => {
      (accountRepository.verifyOwnership as any).mockResolvedValue(true);
      (userSelectedAccountRepository.upsert as any).mockResolvedValue(mockUserSelectedAccount);

      await expect(
        accountService.setUserSelectedAccount('1', '1'),
      ).resolves.not.toThrow();

      expect(userSelectedAccountRepository.upsert).toHaveBeenCalledWith(1, 1);
    });

    it('账户不存在时应该抛出错误', async () => {
      (accountRepository.verifyOwnership as any).mockResolvedValue(false);

      await expect(
        accountService.setUserSelectedAccount('1', '1'),
      ).rejects.toThrow('Account does not belong to user');
    });
  });
});
