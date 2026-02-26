import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportService, type GenerateReportRequest } from '../reportService';

// Mock drizzle schema first to avoid import issues
vi.mock('@/drizzle/schema', () => ({
  users: {},
  accounts: {},
  analysisReports: {},
  transactions: {},
  settings: {},
  modelProviders: {},
  providerModels: {},
  accountFunds: {},
}));

// Mock Repository 单例
vi.mock('@server/repository/accountRepository', () => ({
  accountRepository: {
    existsById: vi.fn(),
  },
}));

vi.mock('@server/repository/analysisReportRepository', () => ({
  analysisReportRepository: {
    createReport: vi.fn(),
    findByAccountId: vi.fn(),
    findByAccountIdAndType: vi.fn(),
    findByIdAndAccountId: vi.fn(),
    countByAccountId: vi.fn(),
    countByAccountIdAndType: vi.fn(),
    verifyOwnership: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    updateProgress: vi.fn(),
    updateContent: vi.fn(),
    markFailed: vi.fn(),
  },
}));

vi.mock('@server/repository/transactionRepository', () => ({
  transactionRepository: {
    getCashFlows: vi.fn(),
    getTotalDepositsAndWithdrawals: vi.fn(),
  },
}));

// Mock 依赖服务
vi.mock('../transactionService', () => ({ default: { getTransactionHistory: vi.fn() } }));
vi.mock('../noteService', () => ({ default: { getUserNotes: vi.fn() } }));
vi.mock('../assetMarketInfoService', () => ({ default: { getAssetMarketInfosByDateRange: vi.fn() } }));
vi.mock('../assetMetaService', () => ({ default: { searchAssetMetasBySymbol: vi.fn() } }));
vi.mock('../positionService', () => ({ default: { getCurrentPositions: vi.fn() } }));
vi.mock('../portfolioSnapshotService', () => ({ default: { getPortfolioSnapshot: vi.fn(), getNearestSnapshot: vi.fn() } }));
vi.mock('../unifiedPriceService', () => ({ unifiedPriceService: { getPrice: vi.fn(), batchGetQuote: vi.fn() } }));
vi.mock('../authService', () => ({ default: { getCurrentUserId: vi.fn() } }));

import { accountRepository } from '@server/repository/accountRepository';
import { analysisReportRepository } from '@server/repository/analysisReportRepository';
import { transactionRepository } from '@server/repository/transactionRepository';

const mockAccount = { id: 1, name: 'Test Account', createdAt: new Date() };

const mockReport = {
  id: 1,
  accountId: 1,
  type: 'weekly' as const,
  title: '投资周报 (1 月 1 日 -1 月 7 日)',
  content: '# 投资周报\n\n这是测试报告内容',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-07'),
  generationProgress: 0,
  generationStage: null,
  dataSourceSummary: null,
  isManuallyEdited: false,
  lastEditedAt: null,
  editCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ReportService', () => {
  let reportService: ReportService;

  beforeEach(() => {
    reportService = new ReportService();
    vi.clearAllMocks();
  });

  describe('generateReport', () => {
    it('应该成功生成报告', async () => {
      const request: GenerateReportRequest = { accountId: '1', type: 'weekly' };
      vi.mocked(accountRepository.existsById).mockResolvedValue(true);
      vi.mocked(analysisReportRepository.createReport).mockResolvedValue(mockReport as any);

      const result = await reportService.generateReport(request);

      expect(result).toEqual({ id: '1', status: 'pending' });
      expect(accountRepository.existsById).toHaveBeenCalledWith(1);
    });

    it('应该在账户不存在时抛出错误', async () => {
      const request: GenerateReportRequest = { accountId: '999', type: 'weekly' };
      vi.mocked(accountRepository.existsById).mockResolvedValue(false);

      await expect(reportService.generateReport(request)).rejects.toThrow('账户 999 不存在');
    });
  });

  describe('getReports', () => {
    it('应该成功获取报告列表', async () => {
      vi.mocked(analysisReportRepository.findByAccountId).mockResolvedValue([mockReport] as any);
      vi.mocked(analysisReportRepository.countByAccountId).mockResolvedValue(1);

      const result = await reportService.getReports('1');

      expect(result.items).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(analysisReportRepository.findByAccountId).toHaveBeenCalledWith(1, 20, 0);
    });

    it('应该支持按类型筛选', async () => {
      vi.mocked(analysisReportRepository.findByAccountIdAndType).mockResolvedValue([mockReport] as any);
      vi.mocked(analysisReportRepository.countByAccountIdAndType).mockResolvedValue(1);

      const result = await reportService.getReports('1', 'weekly');

      expect(result.items).toHaveLength(1);
      expect(analysisReportRepository.findByAccountIdAndType).toHaveBeenCalledWith(1, 'weekly', 20, 0);
    });

    it('应该处理数据库错误', async () => {
      vi.mocked(analysisReportRepository.findByAccountId).mockRejectedValue(new Error('Database error'));

      const result = await reportService.getReports('1');

      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('getReport', () => {
    it('应该成功获取报告详情', async () => {
      vi.mocked(analysisReportRepository.findByIdAndAccountId).mockResolvedValue(mockReport as any);

      const result = await reportService.getReport('1', '1');

      expect(result).toBeTruthy();
      expect(result?.id).toBe('1');
      expect(analysisReportRepository.findByIdAndAccountId).toHaveBeenCalledWith(1, 1);
    });

    it('应该在报告不存在时返回 null', async () => {
      vi.mocked(analysisReportRepository.findByIdAndAccountId).mockResolvedValue(null);

      const result = await reportService.getReport('999', '1');

      expect(result).toBeNull();
    });
  });

  describe('deleteReport', () => {
    it('应该成功删除报告', async () => {
      vi.mocked(analysisReportRepository.verifyOwnership).mockResolvedValue(true);
      vi.mocked(analysisReportRepository.delete).mockResolvedValue(true);

      const result = await reportService.deleteReport('1', '1');

      expect(result).toBe(true);
      expect(analysisReportRepository.verifyOwnership).toHaveBeenCalledWith(1, 1);
      expect(analysisReportRepository.delete).toHaveBeenCalledWith(1);
    });

    it('应该在无权限时返回 false', async () => {
      vi.mocked(analysisReportRepository.verifyOwnership).mockResolvedValue(false);

      const result = await reportService.deleteReport('1', '1');

      expect(result).toBe(false);
      expect(analysisReportRepository.delete).not.toHaveBeenCalled();
    });

    it('应该处理数据库错误', async () => {
      vi.mocked(analysisReportRepository.verifyOwnership).mockRejectedValue(new Error('Database error'));

      const result = await reportService.deleteReport('1', '1');

      expect(result).toBe(false);
    });
  });

  describe('updateReportContent', () => {
    it('应该成功更新报告内容', async () => {
      const updatedReport = { ...mockReport, content: '更新的内容' };
      vi.mocked(analysisReportRepository.findByIdAndAccountId).mockResolvedValue(mockReport as any);
      vi.mocked(analysisReportRepository.update).mockResolvedValue(updatedReport as any);

      const result = await reportService.updateReportContent('1', '1', '更新的内容');

      expect(result).toBeTruthy();
      expect(result?.id).toBe('1');
      expect(analysisReportRepository.update).toHaveBeenCalledWith(1, { content: '更新的内容' });
    });

    it('应该在内容为空时返回 null', async () => {
      const result = await reportService.updateReportContent('1', '1', '');
      expect(result).toBeNull();
    });

    it('应该在报告不存在时返回 null', async () => {
      vi.mocked(analysisReportRepository.findByIdAndAccountId).mockResolvedValue(null);

      const result = await reportService.updateReportContent('999', '1', '内容');

      expect(result).toBeNull();
    });
  });
});
