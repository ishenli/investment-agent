import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StockUtils, isChinaStock, isHkStock, isUsStock, getStockMarketInfo } from '../index';
import { StockMarket } from '../../../../../types/stock';

describe('StockUtils', () => {
  describe('identifyStockMarket', () => {
    it('should identify China A stock (6 digits)', () => {
      expect(StockUtils.identifyStockMarket('000001')).toBe(StockMarket.CHINA_A);
      expect(StockUtils.identifyStockMarket('600000')).toBe(StockMarket.CHINA_A);
      expect(StockUtils.identifyStockMarket('  601318  ')).toBe(StockMarket.CHINA_A);
    });

    it('should identify Hong Kong stock (.HK suffix)', () => {
      expect(StockUtils.identifyStockMarket('0700.HK')).toBe(StockMarket.HONG_KONG);
      expect(StockUtils.identifyStockMarket('09988.HK')).toBe(StockMarket.HONG_KONG);
      expect(StockUtils.identifyStockMarket('00005.HK')).toBe(StockMarket.HONG_KONG);
    });

    it('should identify US stock (1-5 letters)', () => {
      expect(StockUtils.identifyStockMarket('AAPL')).toBe(StockMarket.US);
      expect(StockUtils.identifyStockMarket('TSLA')).toBe(StockMarket.US);
      expect(StockUtils.identifyStockMarket('NVDA')).toBe(StockMarket.US);
      expect(StockUtils.identifyStockMarket('msft')).toBe(StockMarket.US); // lowercase
    });

    it('should return correct market types for edge cases', () => {
      // 空字符串 -> UNKNOWN
      expect(StockUtils.identifyStockMarket('')).toBe(StockMarket.UNKNOWN);
      
      // 5位数字 -> UNKNOWN (不是A股)
      expect(StockUtils.identifyStockMarket('12345')).toBe(StockMarket.UNKNOWN);
      
      // 7位数字 -> UNKNOWN (不是A股)
      expect(StockUtils.identifyStockMarket('1234567')).toBe(StockMarket.UNKNOWN);
      
      // 5位数字+.HK -> HK (正确识别)
      expect(StockUtils.identifyStockMarket('12345.HK')).toBe(StockMarket.HONG_KONG);
      
      // 6位字母 -> UNKNOWN (美股只支持1-5位)
      expect(StockUtils.identifyStockMarket('ABCDEF')).toBe(StockMarket.UNKNOWN);
      
      // US股票+.HK -> UNKNOWN
      expect(StockUtils.identifyStockMarket('AAPL.HK')).toBe(StockMarket.UNKNOWN);
      
      // 4位数字(无.HK) -> UNKNOWN (港股需要.HK后缀)
      expect(StockUtils.identifyStockMarket('0700')).toBe(StockMarket.UNKNOWN);
      
      // 6位数字 -> A股 (正确)
      expect(StockUtils.identifyStockMarket('123456')).toBe(StockMarket.CHINA_A);
    });
  });

  describe('isChinaStock', () => {
    it('should return true for China A stocks', () => {
      expect(StockUtils.isChinaStock('000001')).toBe(true);
      expect(StockUtils.isChinaStock('600000')).toBe(true);
    });

    it('should return false for non-China stocks', () => {
      expect(StockUtils.isChinaStock('0700.HK')).toBe(false);
      expect(StockUtils.isChinaStock('AAPL')).toBe(false);
      expect(StockUtils.isChinaStock('')).toBe(false);
    });

    it('should work with standalone function', () => {
      expect(isChinaStock('000001')).toBe(true);
      expect(isChinaStock('AAPL')).toBe(false);
    });
  });

  describe('isHkStock', () => {
    it('should return true for Hong Kong stocks', () => {
      expect(StockUtils.isHkStock('0700.HK')).toBe(true);
      expect(StockUtils.isHkStock('09988.HK')).toBe(true);
    });

    it('should return false for non-HK stocks', () => {
      expect(StockUtils.isHkStock('000001')).toBe(false);
      expect(StockUtils.isHkStock('AAPL')).toBe(false);
      expect(StockUtils.isHkStock('0700')).toBe(false); // missing .HK
    });

    it('should work with standalone function', () => {
      expect(isHkStock('0700.HK')).toBe(true);
      expect(isHkStock('AAPL')).toBe(false);
    });
  });

  describe('isUsStock', () => {
    it('should return true for US stocks', () => {
      expect(StockUtils.isUsStock('AAPL')).toBe(true);
      expect(StockUtils.isUsStock('TSLA')).toBe(true);
      expect(StockUtils.isUsStock('nvda')).toBe(true); // lowercase
    });

    it('should return false for non-US stocks', () => {
      expect(StockUtils.isUsStock('000001')).toBe(false);
      expect(StockUtils.isUsStock('0700.HK')).toBe(false);
      expect(StockUtils.isUsStock('')).toBe(false);
    });

    it('should work with standalone function', () => {
      expect(isUsStock('AAPL')).toBe(true);
      expect(isUsStock('000001')).toBe(false);
    });
  });

  describe('getCurrencyInfo', () => {
    it('should return correct currency for China A stocks', () => {
      const currency = StockUtils.getCurrencyInfo('000001');
      expect(currency).toEqual({ name: '人民币', symbol: '¥' });
    });

    it('should return correct currency for Hong Kong stocks', () => {
      const currency = StockUtils.getCurrencyInfo('0700.HK');
      expect(currency).toEqual({ name: '港币', symbol: 'HK$' });
    });

    it('should return correct currency for US stocks', () => {
      const currency = StockUtils.getCurrencyInfo('AAPL');
      expect(currency).toEqual({ name: '美元', symbol: '$' });
    });

    it('should return unknown currency for invalid stocks', () => {
      const currency = StockUtils.getCurrencyInfo('INVALID');
      expect(currency).toEqual({ name: '未知', symbol: '?' });
    });
  });

  describe('getDataSource', () => {
    it('should return china_unified for China A stocks', () => {
      expect(StockUtils.getDataSource('000001')).toBe('china_unified');
    });

    it('should return yahoo_finance for Hong Kong stocks', () => {
      expect(StockUtils.getDataSource('0700.HK')).toBe('yahoo_finance');
    });

    it('should return yahoo_finance for US stocks', () => {
      expect(StockUtils.getDataSource('AAPL')).toBe('yahoo_finance');
    });

    it('should return unknown for invalid stocks', () => {
      expect(StockUtils.getDataSource('INVALID')).toBe('unknown');
    });
  });

  describe('normalizeHkTicker', () => {
    it('should add .HK suffix to 4-5 digit numbers', () => {
      expect(StockUtils.normalizeHkTicker('0700')).toBe('0700.HK');
      expect(StockUtils.normalizeHkTicker('09988')).toBe('09988.HK');
    });

    it('should keep already normalized HK tickers unchanged', () => {
      expect(StockUtils.normalizeHkTicker('0700.HK')).toBe('0700.HK');
      expect(StockUtils.normalizeHkTicker('09988.HK')).toBe('09988.HK');
    });

    it('should handle edge cases', () => {
      expect(StockUtils.normalizeHkTicker('')).toBe('');
      expect(StockUtils.normalizeHkTicker('0700.HK')).toBe('0700.HK');
      expect(StockUtils.normalizeHkTicker('AAPL')).toBe('AAPL'); // non-HK stock
    });
  });

  describe('getMarketInfo', () => {
    it('should return correct info for China A stock', () => {
      const info = StockUtils.getMarketInfo('000001');
      expect(info).toEqual({
        ticker: '000001',
        market: StockMarket.CHINA_A,
        market_name: '中国A股',
        currency_name: '人民币',
        currency_symbol: '¥',
        data_source: 'china_unified',
        is_china: true,
        is_hk: false,
        is_us: false,
      });
    });

    it('should return correct info for Hong Kong stock', () => {
      const info = StockUtils.getMarketInfo('0700.HK');
      expect(info).toEqual({
        ticker: '0700.HK',
        market: StockMarket.HONG_KONG,
        market_name: '港股',
        currency_name: '港币',
        currency_symbol: 'HK$',
        data_source: 'yahoo_finance',
        is_china: false,
        is_hk: true,
        is_us: false,
      });
    });

    it('should return correct info for US stock', () => {
      const info = StockUtils.getMarketInfo('AAPL');
      expect(info).toEqual({
        ticker: 'AAPL',
        market: StockMarket.US,
        market_name: '美股',
        currency_name: '美元',
        currency_symbol: '$',
        data_source: 'yahoo_finance',
        is_china: false,
        is_hk: false,
        is_us: true,
      });
    });

    it('should work with standalone function', () => {
      const info = getStockMarketInfo('000001');
      expect(info.market).toBe(StockMarket.CHINA_A);
    });
  });

  describe('getCompanyInfo', () => {
    it('should get company name for China A stock', async () => {
      const marketInfo = StockUtils.getMarketInfo('000001');
      const companyName = await StockUtils.getCompanyInfo('000001', marketInfo);
      expect(companyName).toBe('平安银行');
    });

    it('should get company name for Hong Kong stock', async () => {
      const marketInfo = StockUtils.getMarketInfo('0700.HK');
      const companyName = await StockUtils.getCompanyInfo('0700.HK', marketInfo);
      expect(companyName).toBe('腾讯控股');
    });

    it('should get company name for US stock', async () => {
      const marketInfo = StockUtils.getMarketInfo('AAPL');
      const companyName = await StockUtils.getCompanyInfo('AAPL', marketInfo);
      expect(companyName).toBe('苹果公司');
    });

    it('should return fallback name for unknown stocks', async () => {
      const marketInfo = StockUtils.getMarketInfo('INVALID');
      const companyName = await StockUtils.getCompanyInfo('INVALID', marketInfo);
      expect(companyName).toBe('股票INVALID');
    });
  });
});