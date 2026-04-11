/* eslint-disable @typescript-eslint/ban-ts-comment */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import exchangeRateService, { ExchangeRateService, DEFAULT_EXCHANGE_RATES } from '../exchangeRateService';
import { exchangeRateRepository } from '@server/repository/exchangeRateRepository';
import * as FreeCurrencyAPI from '../exchangeRateService/adapters/FreeCurrencyAPI';

// Mock repository
vi.mock('@server/repository/exchangeRateRepository', () => ({
  exchangeRateRepository: {
    findByCurrencyPair: vi.fn(),
    getAllRates: vi.fn(),
    upsertRate: vi.fn(),
    deleteByCurrencyPair: vi.fn(),
  },
}));

// Mock FreeCurrencyAPI
vi.mock('../exchangeRateService/adapters/FreeCurrencyAPI', () => ({
  fetchExchangeRatesFromAPI: vi.fn(),
}));

describe('ExchangeRateService', () => {
  let service: ExchangeRateService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ExchangeRateService();
  });

  describe('getRate', () => {
    it('should return 1 for same currency pair', async () => {
      const rate = await service.getRate('USD', 'USD');
      expect(rate).toBe(1);
    });

    it('should return rate from repository when found', async () => {
      const mockRate = { rate: 0.135 };
      vi.mocked(exchangeRateRepository.findByCurrencyPair).mockResolvedValue(mockRate as any);

      const rate = await service.getRate('HKD', 'USD');

      expect(exchangeRateRepository.findByCurrencyPair).toHaveBeenCalledWith('HKD', 'USD');
      expect(rate).toBe(0.135);
    });

    it('should return default rate when repository returns null', async () => {
      vi.mocked(exchangeRateRepository.findByCurrencyPair).mockResolvedValue(null);

      const rate = await service.getRate('HKD', 'USD');

      expect(rate).toBe(DEFAULT_EXCHANGE_RATES.HKD_TO_USD);
    });

    it('should return 1 for unknown currency pair', async () => {
      vi.mocked(exchangeRateRepository.findByCurrencyPair).mockResolvedValue(null);

      const rate = await service.getRate('XYZ', 'USD');

      expect(rate).toBe(1);
    });
  });

  describe('getAllRates', () => {
    it('should return rates from repository when available', async () => {
      const mockRates = [
        {
          fromCurrency: 'HKD',
          toCurrency: 'USD',
          rate: 0.135,
          source: 'manual',
          lastUpdated: new Date('2024-01-01'),
        },
      ];
      vi.mocked(exchangeRateRepository.getAllRates).mockResolvedValue(mockRates as any);

      const rates = await service.getAllRates();

      expect(rates).toHaveLength(1);
      expect(rates[0]).toEqual({
        fromCurrency: 'HKD',
        toCurrency: 'USD',
        rate: 0.135,
        source: 'manual',
        lastUpdated: new Date('2024-01-01'),
      });
    });

    it('should return default rates when repository is empty', async () => {
      vi.mocked(exchangeRateRepository.getAllRates).mockResolvedValue([]);

      const rates = await service.getAllRates();

      expect(rates).toHaveLength(2);
      expect(rates[0]).toEqual({
        fromCurrency: 'HKD',
        toCurrency: 'USD',
        rate: DEFAULT_EXCHANGE_RATES.HKD_TO_USD,
        source: 'default',
        lastUpdated: null,
      });
      expect(rates[1]).toEqual({
        fromCurrency: 'CNY',
        toCurrency: 'USD',
        rate: DEFAULT_EXCHANGE_RATES.CNY_TO_USD,
        source: 'default',
        lastUpdated: null,
      });
    });
  });

  describe('setRate', () => {
    it('should upsert rate in repository', async () => {
      const mockResult = {
        fromCurrency: 'HKD',
        toCurrency: 'USD',
        rate: 0.135,
        source: 'manual',
        lastUpdated: new Date('2024-01-01'),
      };
      vi.mocked(exchangeRateRepository.upsertRate).mockResolvedValue(mockResult);

      const result = await service.setRate('HKD', 'USD', 0.135, 'manual');

      expect(exchangeRateRepository.upsertRate).toHaveBeenCalledWith('HKD', 'USD', 0.135, 'manual');
      expect(result).toEqual({
        fromCurrency: 'HKD',
        toCurrency: 'USD',
        rate: 0.135,
        source: 'manual',
        lastUpdated: new Date('2024-01-01'),
      });
    });

    it('should default source to manual when not provided', async () => {
      const mockResult = {
        fromCurrency: 'HKD',
        toCurrency: 'USD',
        rate: 0.135,
        source: 'manual',
        lastUpdated: new Date(),
      };
      vi.mocked(exchangeRateRepository.upsertRate).mockResolvedValue(mockResult);

      await service.setRate('HKD', 'USD', 0.135);

      expect(exchangeRateRepository.upsertRate).toHaveBeenCalledWith('HKD', 'USD', 0.135, 'manual');
    });
  });

  describe('fetchFromAPI', () => {
    it('should fetch rates from API and save to repository', async () => {
      const mockFetchedRates = [
        {
          fromCurrency: 'HKD',
          toCurrency: 'USD',
          rate: 0.128,
          lastUpdated: new Date('2024-01-01'),
        },
      ];
      vi.mocked(FreeCurrencyAPI.fetchExchangeRatesFromAPI).mockResolvedValue(mockFetchedRates);

      const mockResult = {
        fromCurrency: 'HKD',
        toCurrency: 'USD',
        rate: 0.128,
        source: 'api',
        lastUpdated: new Date('2024-01-01'),
      };
      vi.mocked(exchangeRateRepository.upsertRate).mockResolvedValue(mockResult);

      const result = await service.fetchFromAPI();

      expect(FreeCurrencyAPI.fetchExchangeRatesFromAPI).toHaveBeenCalled();
      expect(exchangeRateRepository.upsertRate).toHaveBeenCalledWith('HKD', 'USD', 0.128, 'api');
      expect(result).toHaveLength(1);
      expect(result[0].rate).toBe(0.128);
    });

    it('should throw error when API call fails', async () => {
      const error = new Error('API Error');
      vi.mocked(FreeCurrencyAPI.fetchExchangeRatesFromAPI).mockRejectedValue(error);

      await expect(service.fetchFromAPI()).rejects.toThrow('API Error');
    });
  });

  describe('getDefaultRate', () => {
    it('should return HKD_TO_USD default rate', () => {
      const rate = service.getDefaultRate('HKD', 'USD');
      expect(rate).toBe(DEFAULT_EXCHANGE_RATES.HKD_TO_USD);
    });

    it('should return CNY_TO_USD default rate', () => {
      const rate = service.getDefaultRate('CNY', 'USD');
      expect(rate).toBe(DEFAULT_EXCHANGE_RATES.CNY_TO_USD);
    });

    it('should return 1 for unknown currency pair', () => {
      const rate = service.getDefaultRate('XYZ', 'USD');
      expect(rate).toBe(1);
    });
  });

  describe('getDefaultRates', () => {
    it('should return all default rates', () => {
      const rates = service.getDefaultRates();

      expect(rates).toHaveLength(2);
      expect(rates[0].fromCurrency).toBe('HKD');
      expect(rates[0].toCurrency).toBe('USD');
      expect(rates[0].rate).toBe(DEFAULT_EXCHANGE_RATES.HKD_TO_USD);
      expect(rates[0].source).toBe('default');
      expect(rates[1].fromCurrency).toBe('CNY');
      expect(rates[1].toCurrency).toBe('USD');
      expect(rates[1].rate).toBe(DEFAULT_EXCHANGE_RATES.CNY_TO_USD);
      expect(rates[1].source).toBe('default');
    });
  });

  describe('initializeDefaultRates', () => {
    it('should initialize default rates when repository is empty', async () => {
      vi.mocked(exchangeRateRepository.getAllRates).mockResolvedValue([]);
      vi.mocked(exchangeRateRepository.upsertRate).mockResolvedValue({} as any);

      await service.initializeDefaultRates();

      expect(exchangeRateRepository.upsertRate).toHaveBeenCalledTimes(2);
      expect(exchangeRateRepository.upsertRate).toHaveBeenCalledWith(
        'HKD',
        'USD',
        DEFAULT_EXCHANGE_RATES.HKD_TO_USD,
        'default'
      );
      expect(exchangeRateRepository.upsertRate).toHaveBeenCalledWith(
        'CNY',
        'USD',
        DEFAULT_EXCHANGE_RATES.CNY_TO_USD,
        'default'
      );
    });

    it('should not initialize when repository already has rates', async () => {
      vi.mocked(exchangeRateRepository.getAllRates).mockResolvedValue([{} as any]);

      await service.initializeDefaultRates();

      expect(exchangeRateRepository.upsertRate).not.toHaveBeenCalled();
    });
  });

  describe('convertToUSD', () => {
    it('should convert amount to USD using correct rate', async () => {
      vi.mocked(exchangeRateRepository.findByCurrencyPair).mockResolvedValue({ rate: 0.13 } as any);

      const result = await service.convertToUSD(100, 'HKD');

      expect(result).toBe(13); // 100 * 0.13
    });

    it('should return same amount for USD', async () => {
      const result = await service.convertToUSD(100, 'USD');

      expect(result).toBe(100);
    });
  });

  describe('convertMultiple', () => {
    it('should convert multiple amounts to USD', async () => {
      vi.mocked(exchangeRateRepository.findByCurrencyPair)
        .mockResolvedValueOnce({ rate: 0.13 } as any)
        .mockResolvedValueOnce({ rate: 0.14 } as any);

      const amounts = [
        { amount: 100, fromCurrency: 'HKD' },
        { amount: 200, fromCurrency: 'CNY' },
      ];

      const result = await service.convertMultiple(amounts);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        originalAmount: 100,
        fromCurrency: 'HKD',
        usdAmount: 13,
      });
      expect(result[1].originalAmount).toBe(200);
      expect(result[1].fromCurrency).toBe('CNY');
      expect(result[1].usdAmount).toBeCloseTo(28, 10);
    });

    it('should handle empty array', async () => {
      const result = await service.convertMultiple([]);

      expect(result).toEqual([]);
    });
  });

  describe('resetToDefaults', () => {
    it('should reset all rates to default values', async () => {
      vi.mocked(exchangeRateRepository.upsertRate).mockResolvedValue({} as any);

      await service.resetToDefaults();

      expect(exchangeRateRepository.upsertRate).toHaveBeenCalledTimes(2);
      expect(exchangeRateRepository.upsertRate).toHaveBeenCalledWith(
        'HKD',
        'USD',
        DEFAULT_EXCHANGE_RATES.HKD_TO_USD,
        'default'
      );
      expect(exchangeRateRepository.upsertRate).toHaveBeenCalledWith(
        'CNY',
        'USD',
        DEFAULT_EXCHANGE_RATES.CNY_TO_USD,
        'default'
      );
    });
  });

  describe('deleteRate', () => {
    it('should delete rate by currency pair', async () => {
      vi.mocked(exchangeRateRepository.deleteByCurrencyPair).mockResolvedValue(true);

      const result = await service.deleteRate('HKD', 'USD');

      expect(exchangeRateRepository.deleteByCurrencyPair).toHaveBeenCalledWith('HKD', 'USD');
      expect(result).toBe(true);
    });

    it('should return false when deletion fails', async () => {
      vi.mocked(exchangeRateRepository.deleteByCurrencyPair).mockResolvedValue(false);

      const result = await service.deleteRate('HKD', 'USD');

      expect(result).toBe(false);
    });
  });
});
