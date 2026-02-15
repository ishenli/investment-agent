import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportService, type GenerateReportRequest, type ReportType } from '../reportService';
import { db } from '../../lib/db';
import logger from '../../base/logger';
// Mock drizzle schema
vi.mock('@/drizzle/schema', () => ({
  accounts: {},
  analysisReports: {},
}));

// Mock 数据库和其他依赖服务
vi.mock('../../lib/db', () => ({
  db: {
    query: {
      accounts: {
        findFirst: vi.fn(),
      },
      analysisReports: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(() => ({ from: vi.fn() })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({ rowsAffected: 1 })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
  },
}));

vi.mock('../transactionService', () => ({
  default: {
    getTransactionHistory: vi.fn(),
  },
}));

vi.mock('../noteService', () => ({
  default: {
    getUserNotes: vi.fn(),
  },
}));

vi.mock('../assetMarketInfoService', () => ({
  default: {
    getAssetMarketInfosByDateRange: vi.fn(),
  },
}));

vi.mock('../assetMetaService', () => ({
  default: {
    searchAssetMetasBySymbol: vi.fn(),
  },
}));

vi.mock('../positionService', () => ({
  default: {
    getCurrentPositions: vi.fn(),
  },
}));

vi.mock('../authService', () => ({
  AuthService: {
    getCurrentUserId: vi.fn(),
  },
}));

// Mock 日志
vi.mock('../../base/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));


const mockAccount = {
  id: 1,
  name: 'Test Account',
  createdAt: new Date(),
};

const mockReport = {
  id: 1,
  accountId: 1,
  type: 'weekly' as ReportType,
  title: '投资周报 (1月1日-1月7日)',
  content: '# 投资周报\n\n这是测试报告内容',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-07'),
  createdAt: new Date(),
};

describe('ReportService', () => {
  let reportService: ReportService;

  beforeEach(() => {
    reportService = new ReportService();
    vi.clearAllMocks();
  });

  describe('generateReport', () => {
    it('应该成功生成报告', async () => {
      const request: GenerateReportRequest = {
        accountId: '1',
        type: 'weekly',
      };

      // Mock 数据库查询
      (db.query.accounts.findFirst as jest.Mock).mockResolvedValue(mockAccount);
      (db.insert as jest.Mock).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockReport]),
        }),
      });

      const result = await reportService.generateReport(request);

      expect(result).toEqual({
        id: '1',
        status: 'pending',
      });
      expect(db.query.accounts.findFirst).toHaveBeenCalledWith({
        where: expect.any(Object),
      });
      expect(logger.info).toHaveBeenCalledWith('[ReportService] 开始生成报告', {
        accountId: '1',
        type: 'weekly',
      });
    });

    it('应该在账户不存在时抛出错误', async () => {
      const request: GenerateReportRequest = {
        accountId: '999',
        type: 'weekly',
      };

      (db.query.accounts.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(reportService.generateReport(request)).rejects.toThrow(
        '账户 999 不存在'
      );
    });

    it('应该处理自定义日期范围', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-15');
      const request: GenerateReportRequest = {
        accountId: '1',
        type: 'monthly',
        startDate,
        endDate,
      };

      (db.query.accounts.findFirst as jest.Mock).mockResolvedValue(mockAccount);
      (db.insert as jest.Mock).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockReport]),
        }),
      });

      const result = await reportService.generateReport(request);

      expect(result.id).toBe('1');
      expect(result.status).toBe('pending');
    });
  });

  describe('getReports', () => {
    it('应该成功获取报告列表', async () => {
      const mockReports = [mockReport];
      const mockCountResult = [{ count: 1 }];

      (db.select as jest.Mock).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockCountResult),
        }),
      });
      (db.query.analysisReports.findMany as jest.Mock).mockResolvedValue(mockReports);

      const result = await reportService.getReports('1');

      expect(result.items).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.items[0]).toEqual({
        id: '1',
        title: '投资周报 (1月1日-1月7日)',
        type: 'weekly',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07'),
        createdAt: mockReport.createdAt,
      });
    });

    it('应该按类型过滤报告', async () => {
      (db.select as jest.Mock).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });
      (db.query.analysisReports.findMany as jest.Mock).mockResolvedValue([]);

      const result = await reportService.getReports('1', 'monthly');

      expect(db.query.analysisReports.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        orderBy: expect.any(Array),
        limit: 20,
        offset: 0,
      });
    });

    it('应该处理数据库错误', async () => {
      (db.select as jest.Mock).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      const result = await reportService.getReports('1');

      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getReport', () => {
    it('应该成功获取报告详情', async () => {
      (db.query.analysisReports.findFirst as jest.Mock).mockResolvedValue(mockReport);

      const result = await reportService.getReport('1', '1');

      expect(result).toEqual({
        id: '1',
        accountId: '1',
        type: 'weekly',
        title: '投资周报 (1月1日-1月7日)',
        content: '# 投资周报\n\n这是测试报告内容',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07'),
        createdAt: mockReport.createdAt,
      });
    });

    it('应该在报告不存在时返回 null', async () => {
      (db.query.analysisReports.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await reportService.getReport('999', '1');

      expect(result).toBeNull();
    });

    it('应该处理数据库错误', async () => {
      (db.query.analysisReports.findFirst as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const result = await reportService.getReport('1', '1');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('deleteReport', () => {
    it('应该成功删除报告', async () => {
      (db.delete as jest.Mock).mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
      });

      const result = await reportService.deleteReport('1', '1');

      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('[ReportService] 删除报告', {
        reportId: '1',
        accountId: '1',
      });
    });

    it('应该在删除失败时返回 false', async () => {
      (db.delete as jest.Mock).mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowsAffected: 0 }),
      });

      const result = await reportService.deleteReport('999', '1');

      expect(result).toBe(false);
    });

    it('应该处理数据库错误', async () => {
      (db.delete as jest.Mock).mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('Database error')),
      });

      const result = await reportService.deleteReport('1', '1');

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('updateReportContent', () => {
    it('应该成功更新报告内容', async () => {
      (db.query.analysisReports.findFirst as jest.Mock).mockResolvedValue(mockReport);
      (db.update as jest.Mock).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockReport]),
          }),
        }),
      });

      const result = await reportService.updateReportContent('1', '1', '更新的内容');

      expect(result).toEqual({
        id: '1',
        accountId: '1',
        type: 'weekly',
        title: '投资周报 (1月1日-1月7日)',
        content: '# 投资周报\n\n这是测试报告内容',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07'),
        createdAt: mockReport.createdAt,
      });
      expect(logger.info).toHaveBeenCalledWith('[ReportService] 更新报告成功', {
        reportId: '1',
        accountId: '1',
      });
    });

    it('应该在内容为空时返回 null', async () => {
      const result = await reportService.updateReportContent('1', '1', '');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        '[ReportService] 更新报告失败：内容不能为空',
        { reportId: '1' }
      );
    });

    it('应该在报告不存在时返回 null', async () => {
      (db.query.analysisReports.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await reportService.updateReportContent('999', '1', '内容');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        '[ReportService] 更新报告失败：报告不存在或无权限',
        { reportId: '999', accountId: '1' }
      );
    });

    it('应该处理数据库错误', async () => {
      (db.query.analysisReports.findFirst as jest.Mock).mockResolvedValue(mockReport);
      (db.update as jest.Mock).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      const result = await reportService.updateReportContent('1', '1', '内容');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('私有辅助方法', () => {
    describe('determineDateRange', () => {
      it('应该正确计算周报日期范围', () => {
        // 使用反射访问私有方法进行测试
        const determineDateRange = (reportService as any).determineDateRange.bind(reportService);
        
        const result = determineDateRange('weekly');
        
        expect(result.startDate).toBeInstanceOf(Date);
        expect(result.endDate).toBeInstanceOf(Date);
        // 验证是一周的时间跨度（7天）
        const timeDiff = result.endDate.getTime() - result.startDate.getTime();
        expect(timeDiff).toBeGreaterThanOrEqual(6 * 24 * 60 * 60 * 1000); // 至少6天
        expect(timeDiff).toBeLessThan(8 * 24 * 60 * 60 * 1000); // 少于8天
      });

      it('应该正确计算月报日期范围', () => {
        const determineDateRange = (reportService as any).determineDateRange.bind(reportService);
        
        const result = determineDateRange('monthly');
        
        expect(result.startDate.getDate()).toBe(1); // 月份第一天
        // 验证结束日期是下个月的第一天减一天
        const nextMonth = new Date(result.startDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1);
        nextMonth.setDate(nextMonth.getDate() - 1);
        expect(result.endDate.getDate()).toBe(nextMonth.getDate());
      });

      it('应该处理自定义日期范围', () => {
        const determineDateRange = (reportService as any).determineDateRange.bind(reportService);
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-15');
        
        const result = determineDateRange('weekly', startDate, endDate);
        
        expect(result.startDate).toBe(startDate);
        expect(result.endDate).toBe(endDate);
      });
    });

    describe('generateReportTitle', () => {
      it('应该生成正确的周报标题', () => {
        const generateReportTitle = (reportService as any).generateReportTitle.bind(reportService);
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-07');
        
        const result = generateReportTitle('weekly', startDate, endDate);
        
        expect(result).toContain('投资周报');
        expect(result).toContain('1月1日');
        expect(result).toContain('1月7日');
      });

      it('应该生成正确的月报标题', () => {
        const generateReportTitle = (reportService as any).generateReportTitle.bind(reportService);
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');
        
        const result = generateReportTitle('monthly', startDate, endDate);
        
        expect(result).toContain('投资月报');
      });

      it('应该生成正确的紧急报告标题', () => {
        const generateReportTitle = (reportService as any).generateReportTitle.bind(reportService);
        const startDate = new Date('2024-01-01');
        
        const result = generateReportTitle('emergency', startDate, startDate);
        
        expect(result).toContain('紧急风险报告');
      });
    });
  });
});