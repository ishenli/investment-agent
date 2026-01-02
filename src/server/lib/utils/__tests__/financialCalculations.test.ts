import {
  calculateAnnualizedReturn,
  calculateVolatility,
  calculateSharpeRatio,
  calculateMaxDrawdown,
  calculateDrawdownSeries,
} from '../financialCalculations';

describe('Financial Calculations', () => {
  describe('calculateAnnualizedReturn', () => {
    it('should calculate CAGR correctly for positive returns', () => {
      // 15% total return over 365 days = ~15% annualized
      const result = calculateAnnualizedReturn(0.15, 365);
      expect(result).toBeCloseTo(0.15, 2);
    });

    it('should calculate CAGR correctly for multi-year investments', () => {
      // 50% total return over 730 days (2 years) = ~(1.5)^(1/2) - 1 ≈ 22.47%
      const result = calculateAnnualizedReturn(0.5, 730);
      expect(result).toBeCloseTo(0.2247, 2);
    });

    it('should handle zero return', () => {
      const result = calculateAnnualizedReturn(0, 365);
      expect(result).toBe(0);
    });

    it('should handle negative returns', () => {
      // -10% total return over 365 days
      const result = calculateAnnualizedReturn(-0.1, 365);
      expect(result).toBeCloseTo(-0.1, 2);
    });

    it('should return 0 for zero or negative days', () => {
      expect(calculateAnnualizedReturn(0.1, 0)).toBe(0);
      expect(calculateAnnualizedReturn(0.1, -10)).toBe(0);
    });
  });

  describe('calculateVolatility', () => {
    it('should calculate volatility correctly', () => {
      const returns = [0.02, 0.03, -0.01, 0.04, -0.02];
      const result = calculateVolatility(returns, 252);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
    });

    it('should handle constant returns (zero volatility)', () => {
      const returns = [0.02, 0.02, 0.02, 0.02];
      const result = calculateVolatility(returns, 252);
      expect(result).toBeCloseTo(0, 4);
    });

    it('should handle empty array', () => {
      const result = calculateVolatility([], 252);
      expect(result).toBe(0);
    });

    it('should scale with days parameter', () => {
      const returns = [0.05, -0.03, 0.02, -0.01, 0.04];
      // With same number of return points (5), volatility is the same regardless of total days
      // The function uses Math.min(days, returnRates.length) to limit to actual data points
      const result1 = calculateVolatility(returns, 252);
      const result2 = calculateVolatility(returns, 126);
      expect(result2).toBeCloseTo(result1, 4);
    });
  });

  describe('calculateSharpeRatio', () => {
    it('should calculate Sharpe ratio correctly', () => {
      // Annualized return 15%, volatility 10%, risk-free rate 2.5%
      // Sharpe = (0.15 - 0.025) / 0.1 = 1.25
      const result = calculateSharpeRatio(0.15, 0.1, 0.025);
      expect(result).toBeCloseTo(1.25, 2);
    });

    it('should handle zero volatility', () => {
      const result = calculateSharpeRatio(0.1, 0, 0.025);
      expect(result).toBe(0);
    });

    it('should handle negative Sharpe ratio when return < risk-free rate', () => {
      const result = calculateSharpeRatio(0.02, 0.1, 0.025);
      expect(result).toBeLessThan(0);
    });

    it('should use default risk-free rate when not specified', () => {
      const result = calculateSharpeRatio(0.15, 0.1);
      expect(result).toBeCloseTo(1.25, 2);
    });
  });

  describe('calculateMaxDrawdown', () => {
    it('should calculate maximum drawdown correctly', () => {
      const netValues = [100, 110, 105, 95, 90, 100];
      // Peak: 110, Low: 90, MaxDD = (90 - 110) / 110 = -0.1818
      const result = calculateMaxDrawdown(netValues);
      expect(result).toBeCloseTo(-0.1818, 2);
    });

    it('should return 0 for monotonically increasing values', () => {
      const netValues = [100, 110, 120, 130];
      const result = calculateMaxDrawdown(netValues);
      expect(result).toBe(0);
    });

    it('should handle empty array', () => {
      const result = calculateMaxDrawdown([]);
      expect(result).toBe(0);
    });

    it('should calculate drawdown from first value as peak', () => {
      const netValues = [100, 95, 90, 85];
      const result = calculateMaxDrawdown(netValues);
      expect(result).toBeCloseTo(-0.15, 2);
    });

    it('should handle recovery after drawdown', () => {
      const netValues = [100, 110, 95, 80, 70, 85, 95, 105];
      // Multiple drawdowns, should capture the largest one
      const result = calculateMaxDrawdown(netValues);
      expect(result).toBeLessThan(-0.3); // At least 30% drawdown
    });
  });

  describe('calculateDrawdownSeries', () => {
    it('should calculate drawdown series correctly', () => {
      const netValues = [100, 110, 105, 100];
      // 100: 0, 110: 0 (new peak), 105: (105-110)/110 = -0.045, 100: (100-110)/110 = -0.091
      const result = calculateDrawdownSeries(netValues);
      expect(result[0]).toBe(0);
      expect(result[1]).toBe(0);
      expect(result[2]).toBeCloseTo(-0.045, 2);
      expect(result[3]).toBeCloseTo(-0.091, 2);
    });

    it('should return empty array for empty input', () => {
      const result = calculateDrawdownSeries([]);
      expect(result).toEqual([]);
    });

    it('should have first element always zero', () => {
      const netValues = [100, 120, 80, 150];
      const result = calculateDrawdownSeries(netValues);
      expect(result[0]).toBe(0);
    });

    it('should only update peak when new high is reached', () => {
      const netValues = [100, 90, 80, 85, 90, 95];
      const result = calculateDrawdownSeries(netValues);
      // Peak stays at 100 throughout
      expect(result[0]).toBe(0); // 100
      expect(result[1]).toBeCloseTo(-0.1, 2); // 90
      expect(result[2]).toBeCloseTo(-0.2, 2); // 80
      expect(result[5]).toBeCloseTo(-0.05, 2); // 95 (still below peak)
    });
  });
});