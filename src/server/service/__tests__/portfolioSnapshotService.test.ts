import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PortfolioSnapshotService, SnapshotSource } from '../portfolioSnapshotService';
import { accountRepository } from '@server/repository/accountRepository';
import { accountFundRepository } from '@server/repository/accountFundRepository';
import { assetPositionRepository } from '@server/repository/assetPositionRepository';
import { portfolioSnapshotRepository } from '@server/repository/portfolioSnapshotRepository';
import { unifiedPriceService } from '../unifiedPriceService';
import logger from '@server/base/logger';

// ─── Mock 依赖模块 ────────────────────────────────────────────────

vi.mock('@server/repository/accountRepository', () => ({
  accountRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('@server/repository/accountFundRepository', () => ({
  accountFundRepository: {
    findByAccountId: vi.fn(),
  },
}));

vi.mock('@server/repository/assetPositionRepository', () => ({
  assetPositionRepository: {
    findByAccountId: vi.fn(),
  },
}));

vi.mock('@server/repository/portfolioSnapshotRepository', () => ({
  portfolioSnapshotRepository: {
    findByAccountIdAndDate: vi.fn(),
    findLatestByAccountId: vi.fn(),
    findNearestOnOrBefore: vi.fn(),
    findByAccountIdAndDateRange: vi.fn(),
    findAllByAccountId: vi.fn(),
    createSnapshot: vi.fn(),
    updateSnapshot: vi.fn(),
    deleteSnapshot: vi.fn(),
  },
}));

vi.mock('./priceService', () => ({
  default: {
    getLatestPrice: vi.fn(),
  },
}));

vi.mock('../unifiedPriceService', () => ({
  unifiedPriceService: {
    getQuote: vi.fn(),
  },
}));

vi.mock('@server/base/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// ─── Mock 数据 ─────────────────────────────────────────────────────

const mockAccount = {
  id: 1,
  userId: 1,
  accountName: 'Test Account',
  market: 'US',
  currency: 'USD',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  deletedAt: null,
};

const mockAccountFund = {
  id: 1,
  accountId: 1,
  amountCents: 500000, // $5,000
  currency: 'USD',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPositions = [
  {
    id: 1,
    accountId: 1,
    symbol: 'AAPL',
    quantity: 10,
    averagePriceCents: 15000, // $150
    sector: 'stock',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    id: 2,
    accountId: 1,
    symbol: 'MSFT',
    quantity: 5,
    averagePriceCents: 30000, // $300
    sector: 'stock',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
];

const mockSnapshotDate = new Date('2024-03-01T00:00:00.000Z');

const mockSnapshotEntity = {
  id: 1,
  accountId: 1,
  snapshotDate: mockSnapshotDate,
  totalValueCents: 3700000, // $37,000
  cashBalanceCents: 500000,
  positions: {
    positions: [
      {
        symbol: 'AAPL',
        quantity: 10,
        averagePriceCents: 15000,
        currentPriceCents: 18000,
        marketValueCents: 180000,
        unrealizedGainLossCents: 30000,
        sector: 'stock',
      },
      {
        symbol: 'MSFT',
        quantity: 5,
        averagePriceCents: 30000,
        currentPriceCents: 40000,
        marketValueCents: 200000,
        unrealizedGainLossCents: 50000,
        sector: 'stock',
      },
    ],
    totalPositionsValueCents: 3200000,
    positionCount: 2,
  },
  benchmarkValueCents: 48000,
  benchmarkSymbol: 'SPY',
  source: 'scheduled' as SnapshotSource,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── 测试套件 ──────────────────────────────────────────────────────

describe('PortfolioSnapshotService', () => {
  let service: PortfolioSnapshotService;

  beforeEach(() => {
    service = new PortfolioSnapshotService();
    vi.clearAllMocks();

    // 默认 mock 返回值
    (accountRepository.findById as any).mockResolvedValue(mockAccount);
    (accountFundRepository.findByAccountId as any).mockResolvedValue(mockAccountFund);
    (assetPositionRepository.findByAccountId as any).mockResolvedValue(mockPositions);
    (unifiedPriceService.getQuote as any).mockImplementation((symbol: string) => {
      const prices: Record<string, number> = { AAPL: 180, MSFT: 400, SPY: 480 };
      return Promise.resolve(prices[symbol] != null ? { price: prices[symbol] } : null);
    });
    (portfolioSnapshotRepository.findByAccountIdAndDate as any).mockResolvedValue(null);
    (portfolioSnapshotRepository.createSnapshot as any).mockResolvedValue(mockSnapshotEntity);
    (portfolioSnapshotRepository.updateSnapshot as any).mockResolvedValue(mockSnapshotEntity);
  });

  // ─── createSnapshot ──────────────────────────────────────────────

  describe('createSnapshot', () => {
    it('应该成功创建新快照', async () => {
      const result = await service.createSnapshot(1, mockSnapshotDate, 'manual');

      expect(portfolioSnapshotRepository.findByAccountIdAndDate).toHaveBeenCalledWith(
        1,
        expect.any(Date),
      );
      expect(portfolioSnapshotRepository.createSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 1,
          source: 'manual',
          benchmarkSymbol: 'SPY',
        }),
      );
      expect(result.accountId).toBe(1);
      expect(result.source).toBe('scheduled'); // toRecord 来自 mockSnapshotEntity
    });

    it('当快照已存在时应该更新（幂等性）', async () => {
      (portfolioSnapshotRepository.findByAccountIdAndDate as any).mockResolvedValue(
        mockSnapshotEntity,
      );

      const result = await service.createSnapshot(1, mockSnapshotDate, 'scheduled');

      expect(portfolioSnapshotRepository.updateSnapshot).toHaveBeenCalledWith(
        mockSnapshotEntity.id,
        expect.objectContaining({ source: 'scheduled' }),
      );
      expect(portfolioSnapshotRepository.createSnapshot).not.toHaveBeenCalled();
      expect(result.id).toBe(mockSnapshotEntity.id);
    });

    it('应该根据账户 market 获取价格', async () => {
      const hkAccount = { ...mockAccount, market: 'HK' };
      (accountRepository.findById as any).mockResolvedValue(hkAccount);

      await service.createSnapshot(1, mockSnapshotDate);

      expect(unifiedPriceService.getQuote).toHaveBeenCalledWith(
        expect.any(String),
        'HK',
        expect.any(Object),
      );
    });

    it('当账户不存在时应默认使用 US market 获取价格', async () => {
      (accountRepository.findById as any).mockResolvedValue(null);

      await service.createSnapshot(1, mockSnapshotDate);

      expect(unifiedPriceService.getQuote).toHaveBeenCalledWith(
        expect.any(String),
        'US',
        expect.any(Object),
      );
    });

    it('当持仓为空时应创建零持仓快照', async () => {
      (assetPositionRepository.findByAccountId as any).mockResolvedValue([]);

      await service.createSnapshot(1, mockSnapshotDate);

      expect(portfolioSnapshotRepository.createSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({
          totalValueCents: mockAccountFund.amountCents, // 仅现金
          positions: expect.objectContaining({ positionCount: 0 }),
        }),
      );
    });

    it('当无现金余额记录时应将现金余额视为 0', async () => {
      (accountFundRepository.findByAccountId as any).mockResolvedValue(null);
      (assetPositionRepository.findByAccountId as any).mockResolvedValue([]);

      await service.createSnapshot(1, mockSnapshotDate);

      expect(portfolioSnapshotRepository.createSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({ cashBalanceCents: 0 }),
      );
    });

    it('价格获取失败时应 fallback 并记录警告', async () => {
      (unifiedPriceService.getQuote as any).mockRejectedValue(new Error('API error'));

      await service.createSnapshot(1, mockSnapshotDate);

      expect(logger.warn).toHaveBeenCalled();
      // 价格返回 0，快照仍应正常创建
      expect(portfolioSnapshotRepository.createSnapshot).toHaveBeenCalled();
    });

    it('创建失败时应抛出错误', async () => {
      (portfolioSnapshotRepository.createSnapshot as any).mockRejectedValue(
        new Error('DB error'),
      );

      await expect(service.createSnapshot(1, mockSnapshotDate)).rejects.toThrow(
        'Failed to create snapshot',
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ─── getNearestSnapshot ──────────────────────────────────────────

  describe('getNearestSnapshot', () => {
    it('应该优先返回精确日期匹配的快照', async () => {
      (portfolioSnapshotRepository.findByAccountIdAndDate as any).mockResolvedValue(
        mockSnapshotEntity,
      );

      const result = await service.getNearestSnapshot(1, mockSnapshotDate);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(mockSnapshotEntity.id);
      expect(portfolioSnapshotRepository.findNearestOnOrBefore).not.toHaveBeenCalled();
    });

    it('精确日期无快照时应返回最近日期之前的快照', async () => {
      (portfolioSnapshotRepository.findByAccountIdAndDate as any).mockResolvedValue(null);
      (portfolioSnapshotRepository.findNearestOnOrBefore as any).mockResolvedValue(
        mockSnapshotEntity,
      );

      const result = await service.getNearestSnapshot(1, mockSnapshotDate);

      expect(result).not.toBeNull();
      expect(portfolioSnapshotRepository.findNearestOnOrBefore).toHaveBeenCalledWith(
        1,
        expect.any(Date),
      );
      expect(logger.info).toHaveBeenCalled();
    });

    it('无任何快照时应返回 null', async () => {
      (portfolioSnapshotRepository.findByAccountIdAndDate as any).mockResolvedValue(null);
      (portfolioSnapshotRepository.findNearestOnOrBefore as any).mockResolvedValue(null);

      const result = await service.getNearestSnapshot(1, mockSnapshotDate);

      expect(result).toBeNull();
    });

    it('查询异常时应返回 null 并记录错误', async () => {
      (portfolioSnapshotRepository.findByAccountIdAndDate as any).mockRejectedValue(
        new Error('DB error'),
      );

      const result = await service.getNearestSnapshot(1, mockSnapshotDate);

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ─── getSnapshotsByDateRange ─────────────────────────────────────

  describe('getSnapshotsByDateRange', () => {
    it('应该返回日期范围内的快照列表', async () => {
      (portfolioSnapshotRepository.findByAccountIdAndDateRange as any).mockResolvedValue([
        mockSnapshotEntity,
      ]);

      const start = new Date('2024-01-01');
      const end = new Date('2024-03-31');
      const result = await service.getSnapshotsByDateRange(1, start, end);

      expect(result).toHaveLength(1);
      expect(portfolioSnapshotRepository.findByAccountIdAndDateRange).toHaveBeenCalledWith(
        1,
        expect.any(Date),
        expect.any(Date),
      );
    });

    it('范围内无快照时应返回空数组', async () => {
      (portfolioSnapshotRepository.findByAccountIdAndDateRange as any).mockResolvedValue([]);

      const result = await service.getSnapshotsByDateRange(
        1,
        new Date('2020-01-01'),
        new Date('2020-12-31'),
      );

      expect(result).toEqual([]);
    });

    it('查询异常时应返回空数组并记录错误', async () => {
      (portfolioSnapshotRepository.findByAccountIdAndDateRange as any).mockRejectedValue(
        new Error('DB error'),
      );

      const result = await service.getSnapshotsByDateRange(
        1,
        new Date('2024-01-01'),
        new Date('2024-03-31'),
      );

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ─── getAllSnapshots ─────────────────────────────────────────────

  describe('getAllSnapshots', () => {
    it('应该返回账户所有快照', async () => {
      (portfolioSnapshotRepository.findAllByAccountId as any).mockResolvedValue([
        mockSnapshotEntity,
      ]);

      const result = await service.getAllSnapshots(1);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockSnapshotEntity.id);
    });

    it('无快照时应返回空数组', async () => {
      (portfolioSnapshotRepository.findAllByAccountId as any).mockResolvedValue([]);

      const result = await service.getAllSnapshots(1);

      expect(result).toEqual([]);
    });

    it('查询异常时应返回空数组并记录错误', async () => {
      (portfolioSnapshotRepository.findAllByAccountId as any).mockRejectedValue(
        new Error('DB error'),
      );

      const result = await service.getAllSnapshots(1);

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ─── deleteSnapshot ──────────────────────────────────────────────

  describe('deleteSnapshot', () => {
    it('应该成功删除快照', async () => {
      (portfolioSnapshotRepository.deleteSnapshot as any).mockResolvedValue(true);

      const result = await service.deleteSnapshot(1);

      expect(result).toBe(true);
      expect(portfolioSnapshotRepository.deleteSnapshot).toHaveBeenCalledWith(1);
    });

    it('快照不存在时应返回 false', async () => {
      (portfolioSnapshotRepository.deleteSnapshot as any).mockResolvedValue(false);

      const result = await service.deleteSnapshot(999);

      expect(result).toBe(false);
    });

    it('删除异常时应返回 false 并记录错误', async () => {
      (portfolioSnapshotRepository.deleteSnapshot as any).mockRejectedValue(
        new Error('DB error'),
      );

      const result = await service.deleteSnapshot(1);

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ─── getLatestSnapshot ───────────────────────────────────────────

  describe('getLatestSnapshot', () => {
    it('应该返回最新快照', async () => {
      (portfolioSnapshotRepository.findLatestByAccountId as any).mockResolvedValue(
        mockSnapshotEntity,
      );

      const result = await service.getLatestSnapshot(1);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(mockSnapshotEntity.id);
    });

    it('无快照时应返回 null', async () => {
      (portfolioSnapshotRepository.findLatestByAccountId as any).mockResolvedValue(null);

      const result = await service.getLatestSnapshot(1);

      expect(result).toBeNull();
    });

    it('查询异常时应返回 null 并记录错误', async () => {
      (portfolioSnapshotRepository.findLatestByAccountId as any).mockRejectedValue(
        new Error('DB error'),
      );

      const result = await service.getLatestSnapshot(1);

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ─── hasSnapshotForDate ──────────────────────────────────────────

  describe('hasSnapshotForDate', () => {
    it('当日存在快照时应返回 true', async () => {
      (portfolioSnapshotRepository.findByAccountIdAndDate as any).mockResolvedValue(
        mockSnapshotEntity,
      );

      const result = await service.hasSnapshotForDate(1, mockSnapshotDate);

      expect(result).toBe(true);
    });

    it('当日无快照时应返回 false', async () => {
      (portfolioSnapshotRepository.findByAccountIdAndDate as any).mockResolvedValue(null);

      const result = await service.hasSnapshotForDate(1, mockSnapshotDate);

      expect(result).toBe(false);
    });

    it('查询异常时应返回 false 并记录错误', async () => {
      (portfolioSnapshotRepository.findByAccountIdAndDate as any).mockRejectedValue(
        new Error('DB error'),
      );

      const result = await service.hasSnapshotForDate(1, mockSnapshotDate);

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });

    it('应该将传入日期标准化为当日零点（UTC）', async () => {
      (portfolioSnapshotRepository.findByAccountIdAndDate as any).mockResolvedValue(null);

      const dateWithTime = new Date('2024-03-01T15:30:00.000Z');
      await service.hasSnapshotForDate(1, dateWithTime);

      const passedDate = (portfolioSnapshotRepository.findByAccountIdAndDate as any).mock
        .calls[0][1] as Date;

      expect(passedDate.getUTCHours()).toBe(0);
      expect(passedDate.getUTCMinutes()).toBe(0);
      expect(passedDate.getUTCSeconds()).toBe(0);
    });
  });
});
