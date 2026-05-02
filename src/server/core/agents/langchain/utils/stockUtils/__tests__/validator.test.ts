import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StockDataPreparer, prepareStockData, StockDataPreparationResult } from '../validator';

// Mock logger
const mockLogger = {
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

// Mock the stock data service
vi.mock('../../../../../server/service/stockDataService', () => ({
  getStockData: vi.fn().mockResolvedValue(
    'Date,Open,High,Low,Close,Volume\n2023-01-01,150.0,155.0,149.0,153.0,1000000'
  ),
}));

describe('StockDataPreparer', () => {
  let preparer: StockDataPreparer;

  beforeEach(() => {
    vi.clearAllMocks();
    preparer = new StockDataPreparer(30, mockLogger);
  });

  describe('constructor', () => {
    it('should initialize with default period days', () => {
      const defaultPreparer = new StockDataPreparer(undefined as any, mockLogger);
      // Initialization test
    });

    it('should accept custom period days', () => {
      const customPreparer = new StockDataPreparer(60, mockLogger);
      // Initialization test
    });
  });

  describe('prepareStockData', () => {
    it('should handle empty stock code', async () => {
      const result = await preparer.prepareStockData('', 'auto');
      expect(result.is_valid).toBe(false);
      expect(result.error_message).toBe('股票代码不能为空');
      expect(result.suggestion).toBe('请输入有效的股票代码');
    });

    it('should handle too long stock code', async () => {
      const longCode = '12345678901'; // 11 characters
      const result = await preparer.prepareStockData(longCode, 'auto');
      expect(result.is_valid).toBe(false);
      expect(result.error_message).toBe('股票代码长度不能超过10个字符');
    });

    it('should auto-detect China A stock market type', async () => {
      await preparer.prepareStockData('000001', 'auto');
      expect(mockLogger.debug).toHaveBeenCalledWith('📊 [数据准备] 自动检测市场类型: A股');
    });

    it('should auto-detect Hong Kong stock market type', async () => {
      await preparer.prepareStockData('0700.HK', 'auto');
      expect(mockLogger.debug).toHaveBeenCalledWith('📊 [数据准备] 自动检测市场类型: 港股');
    });

    it('should auto-detect US stock market type', async () => {
      await preparer.prepareStockData('AAPL', 'auto');
      expect(mockLogger.debug).toHaveBeenCalledWith('📊 [数据准备] 自动检测市场类型: 美股');
    });

    it('should handle custom period days', async () => {
      await preparer.prepareStockData('AAPL', '美股', 15);
      expect(mockLogger.info).toHaveBeenCalledWith(
        '📊 [数据准备] 开始准备股票数据: AAPL (市场: 美股, 时长: 15天)'
      );
    });
  });

  describe('validateFormat', () => {
    it('should validate China A stock format (6 digits)', () => {
      const result = (preparer as any).validateFormat('000001', 'A股');
      expect(result.is_valid).toBe(true);
    });

    it('should reject invalid China A stock format', () => {
      const result = (preparer as any).validateFormat('12345', 'A股'); // 5 digits
      expect(result.is_valid).toBe(false);
      expect(result.error_message).toBe('A股代码格式错误，应为6位数字');
    });

    it('should validate Hong Kong stock format (.HK suffix)', () => {
      const result = (preparer as any).validateFormat('0700.HK', '港股');
      expect(result.is_valid).toBe(true);
    });

    it('should validate Hong Kong stock format (digits only)', () => {
      const result = (preparer as any).validateFormat('0700', '港股');
      expect(result.is_valid).toBe(true);
    });

    it('should reject invalid Hong Kong stock format', () => {
      const result = (preparer as any).validateFormat('123.HK', '港股'); // 3 digits
      expect(result.is_valid).toBe(false);
      expect(result.error_message).toBe('港股代码格式错误');
    });

    it('should validate US stock format (1-5 letters)', () => {
      const result = (preparer as any).validateFormat('AAPL', '美股');
      expect(result.is_valid).toBe(true);
    });

    it('should reject invalid US stock format', () => {
      const result = (preparer as any).validateFormat('ABCDEF', '美股'); // 6 letters
      expect(result.is_valid).toBe(false);
      expect(result.error_message).toBe('美股代码格式错误，应为1-5位字母');
    });
  });

  describe('detectMarketType', () => {
    it('should detect China A stock', () => {
      expect((preparer as any).detectMarketType('000001')).toBe('A股');
      expect((preparer as any).detectMarketType('600000')).toBe('A股');
    });

    it('should detect Hong Kong stock', () => {
      expect((preparer as any).detectMarketType('0700.HK')).toBe('港股');
      expect((preparer as any).detectMarketType('09988.HK')).toBe('港股');
      expect((preparer as any).detectMarketType('0700')).toBe('港股'); // without .HK
    });

    it('should detect US stock', () => {
      expect((preparer as any).detectMarketType('AAPL')).toBe('美股');
      expect((preparer as any).detectMarketType('TSLA')).toBe('美股');
      expect((preparer as any).detectMarketType('nvda')).toBe('美股'); // lowercase
    });

    it('should return correct market types for edge cases', () => {
      // 空字符串 -> 未知
      expect((preparer as any).detectMarketType('')).toBe('未知');
      
      // 无效格式 -> 未知
      expect((preparer as any).detectMarketType('INVALID')).toBe('未知');
      
      // 6位数字 -> A股 (正确识别)
      expect((preparer as any).detectMarketType('123456')).toBe('A股');
      
      // 7位数字 -> 未知
      expect((preparer as any).detectMarketType('1234567')).toBe('未知');
    });
  });

  describe('normalizeMarketType', () => {
    it('should normalize US Stock to 美股', () => {
      expect((preparer as any).normalizeMarketType('US Stock')).toBe('美股');
    });

    it('should normalize HK Stock to 港股', () => {
      expect((preparer as any).normalizeMarketType('HK Stock')).toBe('港股');
    });

    it('should normalize A Share to A股', () => {
      expect((preparer as any).normalizeMarketType('A Share')).toBe('A股');
    });

    it('should keep Chinese market types unchanged', () => {
      expect((preparer as any).normalizeMarketType('美股')).toBe('美股');
      expect((preparer as any).normalizeMarketType('港股')).toBe('港股');
      expect((preparer as any).normalizeMarketType('A股')).toBe('A股');
    });

    it('should trim whitespace', () => {
      expect((preparer as any).normalizeMarketType(' 美股 ')).toBe('美股');
      expect((preparer as any).normalizeMarketType(' US Stock ')).toBe('美股');
    });
  });

  describe('prepareUsStockData', () => {
    it('should prepare valid US stock data', async () => {
      const result = await (preparer as any).prepareUsStockData('AAPL', 30, '2023-12-31');
      expect(result.is_valid).toBe(true);
      expect(result.stock_code).toBe('AAPL');
      expect(result.market_type).toBe('美股');
      expect(result.has_historical_data).toBe(true);
      expect(result.has_basic_info).toBe(true);
    });
  });

  describe('global prepareStockData function', () => {
    it('should prepare stock data using global function', async () => {
      const result = await prepareStockData('AAPL', 'auto', 30, '2023-12-31', mockLogger);
      expect(result).toBeInstanceOf(StockDataPreparationResult);
      expect(mockLogger.info).toHaveBeenCalledWith(
        '📊 [数据准备] 开始准备股票数据: AAPL (市场: auto, 时长: 30天)'
      );
    });

    it('should use default values', async () => {
      const result = await prepareStockData('AAPL', undefined as any, undefined as any, undefined as any, mockLogger);
      expect(result).toBeInstanceOf(StockDataPreparationResult);
    });
  });
});