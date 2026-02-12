import { describe, it, expect, vi, beforeEach } from 'vitest';
import authService from '../../service/authService';
import accountService from '../../service/accountService';
import { AccountBizController } from '../account';

// Mock decorators before importing the controller - decorators are applied at import time
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

describe('AccountBizController', () => {
  let controller: AccountBizController;

  beforeEach(() => {
    controller = new AccountBizController();
    vi.clearAllMocks();
  });

  describe('createAccount', () => {
    it('用户未登录时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('');

      const result = await controller.createAccount({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        market: '美股',
        leverage: 1,
        initialDeposit: 10000,
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('用户未登录');
      expect(result.code).toBe('unauthorized');
    });

    it('有效请求应该返回成功响应', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(accountService, 'createAccount').mockResolvedValue({
        userAccount: { id: '1', username: 'testuser' },
        tradingAccount: {
          id: '1',
          userId: '1',
          accountName: 'testuser',
          balance: 10000,
          currency: 'USD',
          leverage: 1,
          market: 'US',
          riskMode: 'retail',
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true,
        },
      } as any);

      const result = await controller.createAccount({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        market: 'US',
        leverage: 1,
        initialDeposit: 10000,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('getAccount', () => {
    it('账户不存在时应该返回错误', async () => {
      vi.spyOn(accountService, 'getTradingAccount').mockResolvedValue(null);

      const result = await controller.getAccount({ accountId: '999' });

      expect(result.success).toBe(false);
      expect(result.message).toBe('账户不存在');
      expect(result.code).toBe('account_not_found');
    });

    it('有效账户应该返回账户数据', async () => {
      vi.spyOn(accountService, 'getTradingAccount').mockResolvedValue({
        id: '1',
        userId: '1',
        accountName: 'Test Account',
        balance: 10000,
        currency: 'USD',
        leverage: 1,
        market: 'US',
        riskMode: 'retail',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      } as any);

      const result = await controller.getAccount({ accountId: '1' });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('updateAccount', () => {
    it('缺少 accountId 时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');

      const result = await controller.updateAccount({
        leverage: 2,
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('缺少accountId参数');
      expect(result.code).toBe('missing_account_id');
    });

    it('用户未登录时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('');

      const result = await controller.updateAccount({
        accountId: '1',
        leverage: 2,
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('用户未登录');
      expect(result.code).toBe('unauthorized');
    });
  });

  describe('getTradingAccount', () => {
    it('用户未登录时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('');

      const result = await controller.getTradingAccount({});

      expect(result.success).toBe(false);
      expect(result.message).toBe('用户未登录');
      expect(result.code).toBe('unauthorized');
    });

    it('账户不存在时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(accountService, 'getTradingAccount').mockResolvedValue(null);

      const result = await controller.getTradingAccount({});

      expect(result.success).toBe(false);
      expect(result.message).toBe('账户不存在');
      expect(result.code).toBe('account_not_found');
    });
  });

  describe('getSelectedAccount', () => {
    it('用户未登录时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('');

      const result = await controller.getSelectedAccount({});

      expect(result.success).toBe(false);
      expect(result.message).toBe('用户未登录');
      expect(result.code).toBe('unauthorized');
    });

    it('应该返回用户选中的账户', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(accountService, 'getUserSelectedAccount').mockResolvedValue({
        id: '1',
        accountName: 'Selected Account',
        balance: 10000,
      } as any);

      const result = await controller.getSelectedAccount({});

      expect(result.success).toBe(true);
      expect(result.data?.selectedAccount).toBeDefined();
    });
  });

  describe('setSelectedAccount', () => {
    it('accountId 为空时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');

      const result = await controller.setSelectedAccount({});

      expect(result.success).toBe(false);
      expect(result.message).toBe('账户ID不能为空');
      expect(result.code).toBe('invalid_request');
    });

    it('用户无权访问账户时应该返回错误', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'userHasAccessToAccount').mockResolvedValue(false);

      const result = await controller.setSelectedAccount({ accountId: '999' });

      expect(result.success).toBe(false);
      expect(result.message).toBe('无权访问该账户');
      expect(result.code).toBe('access_denied');
    });

    it('应该成功设置选中账户', async () => {
      vi.spyOn(authService, 'getCurrentUserId').mockResolvedValue('1');
      vi.spyOn(authService, 'userHasAccessToAccount').mockResolvedValue(true);
      vi.spyOn(accountService, 'setUserSelectedAccount').mockResolvedValue();

      const result = await controller.setSelectedAccount({ accountId: '1' });

      expect(result.success).toBe(true);
      expect(result.data?.message).toBe('选中账户设置成功');
    });
  });
});
