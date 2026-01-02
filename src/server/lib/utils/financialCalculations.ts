import Decimal from 'decimal.js';

/**
 * Calculate annualized return (CAGR)
 * @param totalReturn - Total return as a decimal (e.g., 0.15 for 15%)
 * @param daysInvested - Number of days invested
 * @returns Annualized return as a decimal
 */
export function calculateAnnualizedReturn(totalReturn: number, daysInvested: number): number {
  if (daysInvested <= 0) {
    return 0;
  }

  const onePlusReturn = new Decimal(1).plus(totalReturn);
  // CAGR formula: (1 + totalReturn)^(365/daysInvested) - 1
  const annualized = onePlusReturn.pow(new Decimal(365).div(daysInvested)).minus(1);

  return annualized.toNumber();
}

/**
 * Calculate volatility (annualized standard deviation of returns)
 * @param returnRates - Array of return rates as decimals
 * @param days - Number of days in the period
 * @returns Annualized volatility as a decimal
 */
export function calculateVolatility(returnRates: number[], days: number): number {
  if (returnRates.length === 0) {
    return 0;
  }

  const n = returnRates.length;

  // Calculate mean return
  let sum = new Decimal(0);
  for (const rate of returnRates) {
    sum = sum.plus(rate);
  }
  const mean = sum.div(n);

  // Calculate variance
  let sumSquaredDeviations = new Decimal(0);
  for (const rate of returnRates) {
    const deviation = new Decimal(rate).minus(mean);
    sumSquaredDeviations = sumSquaredDeviations.plus(deviation.pow(2));
  }
  const variance = n > 1 ? sumSquaredDeviations.div(n - 1) : new Decimal(0);

  // Daily volatility (standard deviation)
  const dailyVolatility = variance.squareRoot();

  // Annualize volatility (assuming 252 trading days per year)
  const tradingDays = Math.max(1, Math.min(days, returnRates.length));
  const annualizedVolatility = dailyVolatility.mul(new Decimal(252).div(tradingDays).sqrt());

  return annualizedVolatility.toNumber();
}

/**
 * Calculate Sharpe Ratio
 * @param annualizedReturn - Annualized return as a decimal
 * @param volatility - Annualized volatility as a decimal
 * @param riskFreeRate - Risk-free rate as a decimal (default: 0.025 for 2.5%)
 * @returns Sharpe ratio
 */
export function calculateSharpeRatio(
  annualizedReturn: number,
  volatility: number,
  riskFreeRate: number = 0.025,
): number {
  if (volatility === 0) {
    return 0;
  }

  const excessReturn = annualizedReturn - riskFreeRate;
  return new Decimal(excessReturn).div(volatility).toNumber();
}

/**
 * Calculate maximum drawdown from a series of net values
 * @param netValues - Array of net values over time
 * @returns Maximum drawdown as a negative decimal (e.g., -0.085 for -8.5%)
 */
export function calculateMaxDrawdown(netValues: number[]): number {
  if (netValues.length === 0) {
    return 0;
  }

  let maxDrawdown = 0;
  let peak = netValues[0];

  for (let i = 1; i < netValues.length; i++) {
    const currentValue = netValues[i];

    // Update peak if current value is higher
    if (currentValue > peak) {
      peak = currentValue;
    }

    // Calculate drawdown from peak
    const drawdown = new Decimal(currentValue).minus(peak).div(peak);
    const drawdownValue = drawdown.toNumber();

    // Update max drawdown if current drawdown is smaller (more negative)
    if (drawdownValue < maxDrawdown) {
      maxDrawdown = drawdownValue;
    }
  }

  return maxDrawdown;
}

/**
 * Calculate drawdown series from a series of net values
 * @param netValues - Array of net values over time
 * @returns Array of drawdown values as decimals (0 or negative values)
 */
export function calculateDrawdownSeries(netValues: number[]): number[] {
  if (netValues.length === 0) {
    return [];
  }

  const drawdownSeries: number[] = [];
  let peak = netValues[0];

  for (const currentValue of netValues) {
    // Update peak if current value is higher
    if (currentValue > peak) {
      peak = currentValue;
    }

    // Calculate drawdown from peak
    const drawdown = new Decimal(currentValue).minus(peak).div(peak);
    drawdownSeries.push(drawdown.toNumber());
  }

  return drawdownSeries;
}