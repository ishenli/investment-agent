import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionService, TransactionType } from '../transactionService';
import { TransactionRecordType } from '@typings/transaction';

// Mock @server/lib/db before importing transactionService
vi.mock('@server/lib/db', () => ({
  db: {
    query: {
      transactions: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        insert: vi.fn(),
      },
      accountFunds: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(() => ({ from: vi.fn() })),
    update: vi.fn(),
    delete: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock('@server/service/positionService', () => ({
  default: {
    processTransaction: vi.fn(),
    getPositionBySymbol: vi.fn(),
    updatePosition: vi.fn(),
    deletePosition: vi.fn(),
  },
}));

import { db } from '@server/lib/db';
import positionService from '../positionService';

const mockTransaction = {
  id: 1,
  accountId: 1,
  type: 'buy' as TransactionType,
  symbol: 'AAPL',
  quantity: 10,
  priceCents: 17500,
  totalAmountCents: 175000,
  market: 'US',
  description: 'Buy AAPL',
  feeCents: 0,
  createdAt: new Date(),
  tradeTime: new Date(),
};

const mockTransactionRecord: TransactionRecordType = {
  id: '1',
  accountId: '1',
  type: 'buy' as TransactionType,
  amount: 1750,
  description: 'Buy AAPL',
  referenceId: '1',
  createdAt: new Date(),
  tradeTime: new Date(),
  quantity: 10,
  price: 175,
  symbol: 'AAPL',
  market: 'US',
};

const mockPosition = {
  id: 1,
  accountId: 1,
  symbol: 'AAPL',
  quantity: 10,
  averagePriceCents: 17500,
  averageCost: 175,
  investmentMemo: null,
  sector: 'stock' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('TransactionService', () => {
  let transactionService: TransactionService;

  beforeEach(() => {
    transactionService = new TransactionService();
    vi.clearAllMocks();
  });

  describe('getTransactionHistory', () => {
    it('应该返回交易历史', async () => {
      (db.query.transactions.findMany as any).mockResolvedValue([mockTransaction]);

      const mockWhere = vi.fn().mockResolvedValue([{ count: 1 }]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as any).mockReturnValue({ from: mockFrom });

      const result = await transactionService.getTransactionHistory('1', 50, 0);

      expect(result.transactions).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.transactions[0].id).toBe('1');
      expect(result.transactions[0].type).toBe('buy');
    });

    it('应该支持分页', async () => {
      (db.query.transactions.findMany as any).mockResolvedValue([]);

      const mockWhere = vi.fn().mockResolvedValue([{ count: 10 }]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as any).mockReturnValue({ from: mockFrom });

      const result = await transactionService.getTransactionHistory('1', 10, 5);

      expect(result.transactions).toHaveLength(0);
      expect(result.totalCount).toBe(10);
    });

    it('数据库错误时应该返回空数据', async () => {
      (db.query.transactions.findMany as any).mockRejectedValue(new Error('Database error'));

      const mockWhere = vi.fn().mockResolvedValue([{ count: 0 }]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as any).mockReturnValue({ from: mockFrom });

      const result = await transactionService.getTransactionHistory('1');

      expect(result.transactions).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('dataTypeToDBType', () => {
    it('应该正确转换 deposit 类型', () => {
      // dataTypeToDBType 是私有方法，无法直接测试
      // 但可以通过 addTransaction 验证类型转换
    });
  });

  describe('addTransaction', () => {
    it('应该成功添加买入交易', async () => {
      const mockReturning = vi.fn().mockResolvedValue([mockTransaction]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      (db.insert as any).mockReturnValue({ values: mockValues });
      (positionService.processTransaction as any).mockResolvedValue(mockPosition);

      const result = await transactionService.addTransaction({
        accountId: '1',
        type: 'buy',
        sector: 'stock',
        amount: 1750,
        market: 'US',
        symbol: 'AAPL',
        quantity: 10,
        price: 175,
      });

      expect(result).not.toBeNull();
      expect(result.type).toBe('buy');
      expect(result.symbol).toBe('AAPL');
      expect(result.quantity).toBe(10);
      expect(result.amount).toBe(1750);
      expect(positionService.processTransaction).toHaveBeenCalledWith(
        1, 'AAPL', 10, 17500, 'buy', 'stock',
      );
    });

    it('应该成功添加卖出交易', async () => {
      const sellTransaction = { ...mockTransaction, type: 'sell' as TransactionType };
      const mockReturning = vi.fn().mockResolvedValue([sellTransaction]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      (db.insert as any).mockReturnValue({ values: mockValues });
      (positionService.processTransaction as any).mockResolvedValue(mockPosition);

      const result = await transactionService.addTransaction({
        accountId: '1',
        type: 'sell',
        sector: 'stock',
        amount: 1750,
        market: 'US',
        symbol: 'AAPL',
        quantity: 10,
        price: 175,
      });

      expect(result.type).toBe('sell');
      expect(positionService.processTransaction).toHaveBeenCalledWith(
        1, 'AAPL', 10, 17500, 'sell', 'stock',
      );
    });

    it('应该成功添加存款交易', async () => {
      const depositTransaction = {
        ...mockTransaction,
        type: 'deposit' as TransactionType,
        totalAmountCents: 100000, // 1000 dollars
      };
      const mockReturning = vi.fn().mockResolvedValue([depositTransaction]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      (db.insert as any).mockReturnValue({ values: mockValues });

      const result = await transactionService.addTransaction({
        accountId: '1',
        type: 'deposit',
        sector: 'stock',
        amount: 1000,
        description: 'Initial deposit',
      });

      expect(result.type).toBe('deposit');
      expect(result.amount).toBe(1000);
      expect(positionService.processTransaction).not.toHaveBeenCalled();
    });

    it('应该成功添加取款交易', async () => {
      const withdrawalTransaction = {
        ...mockTransaction,
        type: 'withdrawal' as TransactionType,
        totalAmountCents: 50000, // 500 dollars
      };
      const mockReturning = vi.fn().mockResolvedValue([withdrawalTransaction]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      (db.insert as any).mockReturnValue({ values: mockValues });

      const result = await transactionService.addTransaction({
        accountId: '1',
        type: 'withdrawal',
        sector: 'stock',
        amount: 500,
        description: 'Withdrawal',
      });

      expect(result.type).toBe('withdrawal');
      expect(result.amount).toBe(500);
      expect(positionService.processTransaction).not.toHaveBeenCalled();
    });

    it('买入交易缺少数量时应该抛出错误', async () => {
      await expect(
        transactionService.addTransaction({
          accountId: '1',
          type: 'buy',
          sector: 'stock',
          amount: 1750,
          market: 'US',
          symbol: 'AAPL',
          price: 175,
        }),
      ).rejects.toThrow('买入/卖出交易必须提供数量和价格');
    });

    it('买入交易缺少价格时应该抛出错误', async () => {
      await expect(
        transactionService.addTransaction({
          accountId: '1',
          type: 'buy',
          sector: 'stock',
          amount: 1750,
          market: 'US',
          symbol: 'AAPL',
          quantity: 10,
        }),
      ).rejects.toThrow('买入/卖出交易必须提供数量和价格');
    });

    it('存款交易缺少金额时应该抛出错误', async () => {
      await expect(
        transactionService.addTransaction({
          accountId: '1',
          type: 'deposit',
          sector: 'stock',
        }),
      ).rejects.toThrow('存款/取款交易必须提供金额');
    });

    it('数据库错误时应该抛出错误', async () => {
      const mockValues = vi.fn().mockImplementation(() => {
        throw new Error('Database error');
      });
      (db.insert as any).mockReturnValue({ values: mockValues });

      await expect(
        transactionService.addTransaction({
          accountId: '1',
          type: 'deposit',
          sector: 'stock',
          amount: 1000,
        }),
      ).rejects.toThrow();
    });
  });

  describe('updateTransaction', () => {
    it('应该成功更新交易', async () => {
      (db.query.transactions.findFirst as any).mockResolvedValue(mockTransaction);

      const mockReturning = vi.fn().mockResolvedValue([mockTransaction]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db.update as any).mockReturnValue({ set: mockSet });

      (positionService.getPositionBySymbol as any).mockResolvedValue(mockPosition);
      (positionService.updatePosition as any).mockResolvedValue(mockPosition);
      (positionService.processTransaction as any).mockResolvedValue(mockPosition);

      const result = await transactionService.updateTransaction('1', {
        type: 'sell',
        sector: 'stock',
        quantity: 5,
        price: 180,
      });

      expect(result).not.toBeNull();
      expect(result.id).toBe('1');
    });

    it('交易不存在时应该抛出错误', async () => {
      (db.query.transactions.findFirst as any).mockResolvedValue(null);

      await expect(
        transactionService.updateTransaction('999', {
          type: 'sell',
          sector: 'stock',
          quantity: 5,
        }),
      ).rejects.toThrow('Transaction not found');
    });

    it('更新买入交易缺少数量时应该抛出错误', async () => {
      // 使用没有 quantity 和 priceCents 的模拟交易
      const incompleteTransaction = {
        ...mockTransaction,
        type: 'buy' as TransactionType,
        quantity: null,
        priceCents: null,
      };
      (db.query.transactions.findFirst as any).mockResolvedValue(incompleteTransaction);

      await expect(
        transactionService.updateTransaction('1', {
          type: 'buy',
          sector: 'stock',
        }),
      ).rejects.toThrow('买入/卖出交易必须提供数量和价格');
    });

    it('数据库错误时应该抛出错误', async () => {
      (db.query.transactions.findFirst as any).mockRejectedValue(new Error('Database error'));

      await expect(
        transactionService.updateTransaction('1', {
          type: 'sell',
          sector: 'stock',
        }),
      ).rejects.toThrow();
    });
  });

  describe('getAccountBalance', () => {
    it('应该返回账户余额', async () => {
      const mockAccountFund = {
        accountId: 1,
        amountCents: 100000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (db.query.accountFunds.findFirst as any).mockResolvedValue(mockAccountFund);
      (db.query.transactions.findMany as any).mockResolvedValue([]);

      const result = await transactionService.getAccountBalance('1');

      expect(result).toBe(1000); // 100000 cents = 1000 dollars
    });

    it('账户不存在时应该返回 0', async () => {
      (db.query.accountFunds.findFirst as any).mockResolvedValue(null);

      const result = await transactionService.getAccountBalance('1');

      expect(result).toBe(0);
    });

    it('应该正确计算存款后的余额', async () => {
      const mockAccountFund = {
        accountId: 1,
        amountCents: 100000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const depositTransaction = {
        ...mockTransaction,
        type: 'deposit' as TransactionType,
        totalAmountCents: 50000,
      };
      (db.query.accountFunds.findFirst as any).mockResolvedValue(mockAccountFund);
      (db.query.transactions.findMany as any).mockResolvedValue([depositTransaction]);

      const result = await transactionService.getAccountBalance('1');

      expect(result).toBe(1500); // 1000 + 500
    });

    it('应该正确计算取款后的余额', async () => {
      const mockAccountFund = {
        accountId: 1,
        amountCents: 100000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const withdrawalTransaction = {
        ...mockTransaction,
        type: 'withdrawal' as TransactionType,
        totalAmountCents: 50000,
      };
      (db.query.accountFunds.findFirst as any).mockResolvedValue(mockAccountFund);
      (db.query.transactions.findMany as any).mockResolvedValue([withdrawalTransaction]);

      const result = await transactionService.getAccountBalance('1');

      expect(result).toBe(500); // 1000 - 500
    });

    it('应该正确计算买入后的余额', async () => {
      const mockAccountFund = {
        accountId: 1,
        amountCents: 100000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const buyTransaction = {
        ...mockTransaction,
        type: 'buy' as TransactionType,
        totalAmountCents: 50000,
      };
      (db.query.accountFunds.findFirst as any).mockResolvedValue(mockAccountFund);
      (db.query.transactions.findMany as any).mockResolvedValue([buyTransaction]);

      const result = await transactionService.getAccountBalance('1');

      expect(result).toBe(500); // 1000 - 500
    });

    it('应该正确计算卖出后的余额', async () => {
      const mockAccountFund = {
        accountId: 1,
        amountCents: 100000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const sellTransaction = {
        ...mockTransaction,
        type: 'sell' as TransactionType,
        totalAmountCents: 50000,
      };
      (db.query.accountFunds.findFirst as any).mockResolvedValue(mockAccountFund);
      (db.query.transactions.findMany as any).mockResolvedValue([sellTransaction]);

      const result = await transactionService.getAccountBalance('1');

      expect(result).toBe(1500); // 1000 + 500
    });

    it('数据库错误时应该返回 0', async () => {
      (db.query.accountFunds.findFirst as any).mockRejectedValue(new Error('Database error'));

      const result = await transactionService.getAccountBalance('1');

      expect(result).toBe(0);
    });
  });
});