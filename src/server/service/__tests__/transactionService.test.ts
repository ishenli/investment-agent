import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionService } from '../transactionService';
import { TransactionRecordType, TransactionType } from '@typings/transaction';
import { AssetType } from '@typings/asset';

// Mock Repository 单例（不 mock 底层 db）
vi.mock('@server/repository/transactionRepository', () => ({
  transactionRepository: {
    findById: vi.fn(),
    findByAccountId: vi.fn(),
    countByAccountId: vi.fn(),
    createTransaction: vi.fn(),
    updateTransaction: vi.fn(),
    findBeforeTransactionId: vi.fn(),
  },
}));

vi.mock('@server/repository/accountFundRepository', () => ({
  accountFundRepository: {
    findByAccountId: vi.fn(),
    updateBalance: vi.fn(),
    createAccountFund: vi.fn(),
    existsByAccountId: vi.fn(),
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

vi.mock('@server/service/priceService', () => ({
  default: {
    updatePrice: vi.fn(),
  },
}));

import { transactionRepository } from '@server/repository/transactionRepository';
import { accountFundRepository } from '@server/repository/accountFundRepository';
import positionService from '../positionService';
import priceService from '../priceService';

const mockTransaction = {
  id: 1,
  accountId: 1,
  type: 'buy' as TransactionType,
  symbol: 'AAPL',
  quantity: 10,
  priceCents: 17500,
  totalAmountCents: 175000,
  market: 'US' as const,
  description: 'Buy AAPL',
  feeCents: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
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

const mockAccountFund = {
  id: 1,
  accountId: 1,
  amountCents: 200000, // $2000 - enough for buy transactions
  currency: 'USD',
  leverage: 1,
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
      vi.mocked(transactionRepository.findByAccountId).mockResolvedValue([mockTransaction]);
      vi.mocked(transactionRepository.countByAccountId).mockResolvedValue(1);

      const result = await transactionService.getTransactionHistory('1', 50, 0);

      expect(result.transactions).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.transactions[0].id).toBe('1');
      expect(result.transactions[0].type).toBe('buy');
      expect(transactionRepository.findByAccountId).toHaveBeenCalledWith(1, 50, 0);
    });

    it('应该支持分页', async () => {
      vi.mocked(transactionRepository.findByAccountId).mockResolvedValue([]);
      vi.mocked(transactionRepository.countByAccountId).mockResolvedValue(10);

      const result = await transactionService.getTransactionHistory('1', 10, 5);

      expect(result.transactions).toHaveLength(0);
      expect(result.totalCount).toBe(10);
      expect(transactionRepository.findByAccountId).toHaveBeenCalledWith(1, 10, 5);
    });

    it('数据库错误时应该返回空数据', async () => {
      vi.mocked(transactionRepository.findByAccountId).mockRejectedValue(new Error('Database error'));
      vi.mocked(transactionRepository.countByAccountId).mockResolvedValue(0);

      const result = await transactionService.getTransactionHistory('1');

      expect(result.transactions).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('addTransaction', () => {
        it('应该成功添加买入交易', async () => {
      vi.mocked(transactionRepository.createTransaction).mockResolvedValue(mockTransaction);
      vi.mocked(positionService.processTransaction).mockResolvedValue(mockPosition);
      vi.mocked(accountFundRepository.findByAccountId).mockResolvedValue(mockAccountFund);
      vi.mocked(accountFundRepository.updateBalance).mockResolvedValue(mockAccountFund);

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
      expect(transactionRepository.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 1,
          type: 'buy',
          symbol: 'AAPL',
          quantity: 10,
          priceCents: 17500,
          totalAmountCents: 175000,
        }),
      );
      // 买入时余额应该扣减: 100000 - 175000 = -75000
      expect(accountFundRepository.findByAccountId).toHaveBeenCalledWith(1);
      expect(accountFundRepository.updateBalance).toHaveBeenCalledWith(1, 25000); // 200000 - 175000
      expect(positionService.processTransaction).toHaveBeenCalledWith(
        1, 'AAPL', 10, 17500, 'buy', 'stock', 'USD',
      );
    });

    it('买入交易余额不足时应该抛出错误', async () => {
      vi.mocked(transactionRepository.createTransaction).mockResolvedValue(mockTransaction);
      vi.mocked(accountFundRepository.findByAccountId).mockResolvedValue({
        ...mockAccountFund,
        amountCents: 50000, // 500 dollars, not enough for 1750
      });

      await expect(
        transactionService.addTransaction({
          accountId: '1',
          type: 'buy',
          sector: 'stock',
          amount: 1750,
          market: 'US',
          symbol: 'AAPL',
          quantity: 10,
          price: 175,
        }),
      ).rejects.toThrow('账户余额不足');
    });

    it('应该成功添加卖出交易', async () => {
      const sellTransaction = { ...mockTransaction, type: 'sell' as TransactionType };
      vi.mocked(transactionRepository.createTransaction).mockResolvedValue(sellTransaction);
      vi.mocked(positionService.processTransaction).mockResolvedValue(mockPosition);
      vi.mocked(accountFundRepository.findByAccountId).mockResolvedValue(mockAccountFund);
      vi.mocked(accountFundRepository.updateBalance).mockResolvedValue(mockAccountFund);

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
      // 卖出时余额应该增加: 100000 + 175000 = 275000
      expect(accountFundRepository.findByAccountId).toHaveBeenCalledWith(1);
      expect(accountFundRepository.updateBalance).toHaveBeenCalledWith(1, 375000); // 200000 + 175000
      expect(positionService.processTransaction).toHaveBeenCalledWith(
        1, 'AAPL', 10, 17500, 'sell', 'stock', 'USD',
      );
    });

    it('应该成功添加存款交易并更新账户余额', async () => {
      const depositTransaction = {
        ...mockTransaction,
        type: 'deposit' as TransactionType,
        symbol: null,
        quantity: null,
        priceCents: null,
        totalAmountCents: 100000, // 1000 dollars
      };
      vi.mocked(transactionRepository.createTransaction).mockResolvedValue(depositTransaction);
      vi.mocked(accountFundRepository.findByAccountId).mockResolvedValue(mockAccountFund);
      vi.mocked(accountFundRepository.updateBalance).mockResolvedValue({
        ...mockAccountFund,
        amountCents: 200000,
      });

      const result = await transactionService.addTransaction({
        accountId: '1',
        type: 'deposit',
        sector: 'stock',
        amount: 1000,
        description: 'Initial deposit',
      });

      expect(result.type).toBe('deposit');
      expect(result.amount).toBe(1000);
      expect(accountFundRepository.updateBalance).toHaveBeenCalledWith(1, 300000); // 200000 + 100000
      expect(positionService.processTransaction).not.toHaveBeenCalled();
    });

    it('应该成功添加存款交易并创建新的账户资金记录', async () => {
      const depositTransaction = {
        ...mockTransaction,
        type: 'deposit' as TransactionType,
        symbol: null,
        quantity: null,
        priceCents: null,
        totalAmountCents: 100000,
      };
      vi.mocked(transactionRepository.createTransaction).mockResolvedValue(depositTransaction);
      vi.mocked(accountFundRepository.findByAccountId).mockResolvedValue(null);
      vi.mocked(accountFundRepository.createAccountFund).mockResolvedValue(mockAccountFund);

      const result = await transactionService.addTransaction({
        accountId: '1',
        type: 'deposit',
        sector: 'stock',
        amount: 1000,
        description: 'Initial deposit',
      });

      expect(result.type).toBe('deposit');
      expect(accountFundRepository.createAccountFund).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 1,
          amountCents: 100000, // 存款金额为 1000 美元 = 100000 cents, // $2000 - enough for buy transactions
        }),
      );
    });

    it('应该成功添加取款交易', async () => {
      const withdrawalTransaction = {
        ...mockTransaction,
        type: 'withdrawal' as TransactionType,
        symbol: null,
        quantity: null,
        priceCents: null,
        totalAmountCents: 50000, // 500 dollars
      };
      vi.mocked(transactionRepository.createTransaction).mockResolvedValue(withdrawalTransaction);
      vi.mocked(accountFundRepository.findByAccountId).mockResolvedValue(mockAccountFund);
      vi.mocked(accountFundRepository.updateBalance).mockResolvedValue({
        ...mockAccountFund,
        amountCents: 50000,
      });

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

    it('买入交易应该确保 assetMeta 记录存在', async () => {
      vi.mocked(transactionRepository.createTransaction).mockResolvedValue(mockTransaction);
      vi.mocked(positionService.processTransaction).mockResolvedValue(mockPosition);
      vi.mocked(priceService.updatePrice).mockResolvedValue(null);

      await transactionService.addTransaction({
        accountId: '1',
        type: 'buy',
        sector: 'stock',
        amount: 1750,
        market: 'US',
        symbol: 'AAPL',
        quantity: 10,
        price: 175,
      });

      expect(priceService.updatePrice).toHaveBeenCalledWith({
        symbol: 'AAPL',
        price: 175,
        assetType: 'stock',
        currency: 'USD',
        source: 'manual',
        market: 'US',
      });
    });

    it('基金买入交易应该使用 CNY 货币创建 assetMeta', async () => {
      const fundTransaction = {
        ...mockTransaction,
        symbol: '012349',
        quantity: 5000,
        priceCents: 69,
        totalAmountCents: 345000,
        market: 'CN' as const,
      };
      vi.mocked(transactionRepository.createTransaction).mockResolvedValue(fundTransaction);
      vi.mocked(positionService.processTransaction).mockResolvedValue(mockPosition);
      vi.mocked(priceService.updatePrice).mockResolvedValue(null);
      vi.mocked(accountFundRepository.findByAccountId).mockResolvedValue({
        ...mockAccountFund,
        amountCents: 500000, // $5000 - enough for this transaction
      });
      vi.mocked(accountFundRepository.updateBalance).mockResolvedValue(mockAccountFund);

      await transactionService.addTransaction({
        accountId: '1',
        type: 'buy',
        sector: 'fund',
        amount: 3450,
        market: 'CN',
        symbol: '012349',
        quantity: 5000,
        price: 0.69,
      });

      expect(positionService.processTransaction).toHaveBeenCalledWith(
        1, '012349', 5000, 69, 'buy', 'fund', 'CNY',
      );
      expect(priceService.updatePrice).toHaveBeenCalledWith({
        symbol: '012349',
        price: 0.69,
        assetType: 'fund',
        currency: 'CNY',
        source: 'manual',
        market: 'CN',
      });
    });

    it('assetMeta 创建失败不应影响交易结果', async () => {
      vi.mocked(transactionRepository.createTransaction).mockResolvedValue(mockTransaction);
      vi.mocked(positionService.processTransaction).mockResolvedValue(mockPosition);
      vi.mocked(priceService.updatePrice).mockRejectedValue(new Error('DB error'));

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

      // 交易仍应成功返回
      expect(result).not.toBeNull();
      expect(result.symbol).toBe('AAPL');
    });

    it('存款交易不应调用 priceService.updatePrice', async () => {
      const depositTransaction = {
        ...mockTransaction,
        type: 'deposit' as TransactionType,
        symbol: null,
        quantity: null,
        priceCents: null,
        totalAmountCents: 100000,
      };
      vi.mocked(transactionRepository.createTransaction).mockResolvedValue(depositTransaction);
      vi.mocked(accountFundRepository.findByAccountId).mockResolvedValue(mockAccountFund);
      vi.mocked(accountFundRepository.updateBalance).mockResolvedValue({
        ...mockAccountFund,
        amountCents: 200000,
      });

      await transactionService.addTransaction({
        accountId: '1',
        type: 'deposit',
        sector: 'stock',
        amount: 1000,
      });

      expect(priceService.updatePrice).not.toHaveBeenCalled();
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
          sector: 'stock' as AssetType,
          amount: undefined as unknown as number,
        }),
      ).rejects.toThrow('存款/取款交易必须提供金额');
    });

    it('数据库错误时应该抛出错误', async () => {
      vi.mocked(transactionRepository.createTransaction).mockRejectedValue(new Error('Database error'));

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
      vi.mocked(transactionRepository.findById).mockResolvedValue(mockTransaction);
      vi.mocked(transactionRepository.updateTransaction).mockResolvedValue(mockTransaction);
      vi.mocked(positionService.getPositionBySymbol).mockResolvedValue(mockPosition);
      vi.mocked(positionService.updatePosition).mockResolvedValue(mockPosition);
      vi.mocked(positionService.processTransaction).mockResolvedValue(mockPosition);

      const result = await transactionService.updateTransaction('1', {
        type: 'sell',
        sector: 'stock',
        quantity: 5,
        price: 180,
      });

      expect(result).not.toBeNull();
      expect(result.id).toBe('1');
      expect(transactionRepository.updateTransaction).toHaveBeenCalled();
    });

    it('交易不存在时应该抛出错误', async () => {
      vi.mocked(transactionRepository.findById).mockResolvedValue(null);

      await expect(
        transactionService.updateTransaction('999', {
          type: 'sell',
          sector: 'stock',
          quantity: 5,
        }),
      ).rejects.toThrow('Transaction not found');
    });

    it('更新买入交易缺少数量时应该抛出错误', async () => {
      const incompleteTransaction = {
        ...mockTransaction,
        type: 'buy' as TransactionType,
        quantity: null,
        priceCents: null,
      };
      vi.mocked(transactionRepository.findById).mockResolvedValue(incompleteTransaction);

      await expect(
        transactionService.updateTransaction('1', {
          type: 'buy',
          sector: 'stock',
        }),
      ).rejects.toThrow('买入/卖出交易必须提供数量和价格');
    });

    it('数据库错误时应该抛出错误', async () => {
      vi.mocked(transactionRepository.findById).mockRejectedValue(new Error('Database error'));

      await expect(
        transactionService.updateTransaction('1', {
          type: 'sell',
          sector: 'stock',
        }),
      ).rejects.toThrow();
    });

    it('更新存款交易时应该正确调整账户余额', async () => {
      const depositTransaction = {
        ...mockTransaction,
        type: 'deposit' as TransactionType,
        symbol: null,
        quantity: null,
        priceCents: null,
        totalAmountCents: 100000,
      };
      const updatedDepositTransaction = {
        ...depositTransaction,
        totalAmountCents: 150000,
      };

      vi.mocked(transactionRepository.findById).mockResolvedValue(depositTransaction);
      vi.mocked(transactionRepository.updateTransaction).mockResolvedValue(updatedDepositTransaction);
      vi.mocked(accountFundRepository.findByAccountId).mockResolvedValue(mockAccountFund);
      vi.mocked(accountFundRepository.updateBalance).mockResolvedValue(mockAccountFund);

      const result = await transactionService.updateTransaction('1', {
        type: 'deposit',
        amount: 1500,
      });

      expect(result).not.toBeNull();
      expect(accountFundRepository.updateBalance).toHaveBeenCalled();
    });
  });

  describe('getAccountBalance', () => {
    it('应该返回账户余额', async () => {
      vi.mocked(accountFundRepository.findByAccountId).mockResolvedValue(mockAccountFund);
      vi.mocked(transactionRepository.findByAccountId).mockResolvedValue([]);

      const result = await transactionService.getAccountBalance('1');

      expect(result).toBe(2000); // 200000 cents = 2000 dollars
    });

    it('账户不存在时应该返回 0', async () => {
      vi.mocked(accountFundRepository.findByAccountId).mockResolvedValue(null);

      const result = await transactionService.getAccountBalance('1');

      expect(result).toBe(0);
    });

    
  });
});
