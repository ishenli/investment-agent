import logger from '@server/base/logger';
import { chatModelOpenAI } from '@server/core/provider/chatModel';
import {
  getFinancialMetrics,
  getMarketCap,
  searchLineItems,
} from '@server/dataflows/financialDataSets';
import { extractJsonFromText } from '@/shared';
import { WarrenBuffettSignal } from '@typings/agents/warrenBuffett';
import { HumanMessage, SystemMessage } from 'langchain';
interface FinancialMetrics {
  ticker: string;
  report_period: string;
  period: string;
  currency: string;
  return_on_equity?: number;
  debt_to_equity?: number;
  operating_margin?: number;
  current_ratio?: number;
  return_on_invested_capital?: number;
  asset_turnover?: number;
}
interface FinancialLineItem {
  ticker: string;
  report_period: string;
  period: string;
  currency: string;
  capital_expenditure?: number;
  depreciation_and_amortization?: number;
  net_income?: number;
  outstanding_shares?: number;
  total_assets?: number;
  total_liabilities?: number;
  shareholders_equity?: number;
  dividends_and_other_cash_distributions?: number;
  issuance_or_purchase_of_equity_shares?: number;
  gross_profit?: number;
  revenue?: number;
  free_cash_flow?: number;
  gross_margin?: number;
  current_assets?: number;
  current_liabilities?: number;
}

export interface AnalysisData {
  ticker: string;
  score: number;
  max_score: number;
  fundamental_analysis: {
    score: number;
    details: string;
    metrics: any;
  };
  consistency_analysis: {
    score: number;
    details: string;
  };
  moat_analysis: {
    score: number;
    max_score: number;
    details: string;
  };
  pricing_power_analysis: {
    score: number;
    details: string;
  };
  book_value_analysis: {
    score: number;
    details: string;
  };
  management_analysis: {
    score: number;
    max_score: number;
    details: string;
  };
  intrinsic_value_analysis: {
    intrinsic_value?: number;
    details: string[];
    owner_earnings?: number;
    assumptions?: any;
  };
  market_cap?: number | null;
  margin_of_safety?: number | null;
}

function analyzeFundamentals(metrics: FinancialMetrics[]): {
  score: number;
  details: string;
  metrics: any;
} {
  /** Analyze company fundamentals based on Buffett's criteria. */
  if (!metrics || metrics.length === 0) {
    return { score: 0, details: 'Insufficient fundamental data', metrics: {} };
  }

  const latestMetrics = metrics[0];
  let score = 0;
  const reasoning: string[] = [];

  // Check ROE (Return on Equity)
  if (latestMetrics.return_on_equity && latestMetrics.return_on_equity > 0.15) {
    score += 2;
    reasoning.push(`Strong ROE of ${(latestMetrics.return_on_equity * 100).toFixed(1)}%`);
  } else if (latestMetrics.return_on_equity) {
    reasoning.push(`Weak ROE of ${(latestMetrics.return_on_equity * 100).toFixed(1)}%`);
  } else {
    reasoning.push('ROE data not available');
  }

  // Check Debt to Equity
  if (latestMetrics.debt_to_equity && latestMetrics.debt_to_equity < 0.5) {
    score += 2;
    reasoning.push('Conservative debt levels');
  } else if (latestMetrics.debt_to_equity) {
    reasoning.push(`High debt to equity ratio of ${latestMetrics.debt_to_equity.toFixed(1)}`);
  } else {
    reasoning.push('Debt to equity data not available');
  }

  // Check Operating Margin
  if (latestMetrics.operating_margin && latestMetrics.operating_margin > 0.15) {
    score += 2;
    reasoning.push('Strong operating margins');
  } else if (latestMetrics.operating_margin) {
    reasoning.push(
      `Weak operating margin of ${(latestMetrics.operating_margin * 100).toFixed(1)}%`,
    );
  } else {
    reasoning.push('Operating margin data not available');
  }

  // Check Current Ratio
  if (latestMetrics.current_ratio && latestMetrics.current_ratio > 1.5) {
    score += 1;
    reasoning.push('Good liquidity position');
  } else if (latestMetrics.current_ratio) {
    reasoning.push(
      `Weak liquidity with current ratio of ${latestMetrics.current_ratio.toFixed(1)}`,
    );
  } else {
    reasoning.push('Current ratio data not available');
  }

  return {
    score,
    details: reasoning.join('; '),
    metrics: latestMetrics,
  };
}
function analyzeConsistency(financialLineItems: FinancialLineItem[]): {
  score: number;
  details: string;
} {
  /** Analyze earnings consistency and growth. */
  if (financialLineItems.length < 4) {
    // Need at least 4 periods for trend analysis
    return { score: 0, details: 'Insufficient historical data' };
  }

  let score = 0;
  const reasoning: string[] = [];

  // Check earnings growth trend
  const earningsValues = financialLineItems
    .filter((item) => item.net_income !== undefined)
    .map((item) => item.net_income!);

  if (earningsValues.length >= 4) {
    // Simple check: is each period's earnings bigger than the next?
    const earningsGrowth = earningsValues.every(
      (value, index) => index === earningsValues.length - 1 || value > earningsValues[index + 1],
    );

    if (earningsGrowth) {
      score += 3;
      reasoning.push('Consistent earnings growth over past periods');
    } else {
      reasoning.push('Inconsistent earnings growth pattern');
    }

    // Calculate total growth rate from oldest to latest
    if (earningsValues.length >= 2 && earningsValues[earningsValues.length - 1] !== 0) {
      const growthRate =
        (earningsValues[0] - earningsValues[earningsValues.length - 1]) /
        Math.abs(earningsValues[earningsValues.length - 1]);
      reasoning.push(
        `Total earnings growth of ${(growthRate * 100).toFixed(1)}% over past ${earningsValues.length} periods`,
      );
    }
  } else {
    reasoning.push('Insufficient earnings data for trend analysis');
  }

  return {
    score,
    details: reasoning.join('; '),
  };
}

function analyzeMoat(metrics: FinancialMetrics[]): {
  score: number;
  max_score: number;
  details: string;
} {
  /**
   * Evaluate whether the company likely has a durable competitive advantage (moat).
   * Enhanced to include multiple moat indicators that Buffett actually looks for:
   * 1. Consistent high returns on capital
   * 2. Pricing power (stable/growing margins)
   * 3. Scale advantages (improving metrics with size)
   * 4. Brand strength (inferred from margins and consistency)
   * 5. Switching costs (inferred from customer retention)
   */
  if (!metrics || metrics.length < 5) {
    // Need more data for proper moat analysis
    return {
      score: 0,
      max_score: 5,
      details: 'Insufficient data for comprehensive moat analysis',
    };
  }

  const reasoning: string[] = [];
  let moatScore = 0;
  const maxScore = 5;

  // 1. Return on Capital Consistency (Buffett's favorite moat indicator)
  const historicalRoes = metrics
    .filter((m) => m.return_on_equity !== undefined)
    .map((m) => m.return_on_equity!);

  const historicalRoics = metrics
    .filter((m) => m.return_on_invested_capital !== undefined)
    .map((m) => m.return_on_invested_capital!);

  if (historicalRoes.length >= 5) {
    // Check for consistently high ROE (>15% for most periods)
    const highRoePeriods = historicalRoes.filter((roe) => roe > 0.15).length;
    const roeConsistency = highRoePeriods / historicalRoes.length;

    if (roeConsistency >= 0.8) {
      // 80%+ of periods with ROE > 15%
      moatScore += 2;
      const avgRoe = historicalRoes.reduce((sum, roe) => sum + roe, 0) / historicalRoes.length;
      reasoning.push(
        `Excellent ROE consistency: ${highRoePeriods}/${historicalRoes.length} periods >15% (avg: ${(avgRoe * 100).toFixed(1)}%) - indicates durable competitive advantage`,
      );
    } else if (roeConsistency >= 0.6) {
      moatScore += 1;
      reasoning.push(
        `Good ROE performance: ${highRoePeriods}/${historicalRoes.length} periods >15%`,
      );
    } else {
      reasoning.push(
        `Inconsistent ROE: only ${highRoePeriods}/${historicalRoes.length} periods >15%`,
      );
    }
  } else {
    reasoning.push('Insufficient ROE history for moat analysis');
  }

  // 2. Operating Margin Stability (Pricing Power Indicator)
  const historicalMargins = metrics
    .filter((m) => m.operating_margin !== undefined)
    .map((m) => m.operating_margin!);

  if (historicalMargins.length >= 5) {
    // Check for stable or improving margins (sign of pricing power)
    const avgMargin =
      historicalMargins.reduce((sum, margin) => sum + margin, 0) / historicalMargins.length;
    const recentMargins = historicalMargins.slice(0, 3); // Last 3 periods
    const olderMargins = historicalMargins.slice(-3); // First 3 periods

    const recentAvg = recentMargins.reduce((sum, margin) => sum + margin, 0) / recentMargins.length;
    const olderAvg = olderMargins.reduce((sum, margin) => sum + margin, 0) / olderMargins.length;

    if (avgMargin > 0.2 && recentAvg >= olderAvg) {
      // 20%+ margins and stable/improving
      moatScore += 1;
      reasoning.push(
        `Strong and stable operating margins (avg: ${(avgMargin * 100).toFixed(1)}%) indicate pricing power moat`,
      );
    } else if (avgMargin > 0.15) {
      // At least decent margins
      reasoning.push(
        `Decent operating margins (avg: ${(avgMargin * 100).toFixed(1)}%) suggest some competitive advantage`,
      );
    } else {
      reasoning.push(
        `Low operating margins (avg: ${(avgMargin * 100).toFixed(1)}%) suggest limited pricing power`,
      );
    }
  }

  // 3. Asset Efficiency and Scale Advantages
  if (metrics.length >= 5) {
    // Check asset turnover trends (revenue efficiency)
    const assetTurnovers = metrics
      .filter((m) => m.asset_turnover !== undefined)
      .map((m) => m.asset_turnover!);

    if (assetTurnovers.length >= 3) {
      if (assetTurnovers.some((turnover) => turnover > 1.0)) {
        // Efficient asset use
        moatScore += 1;
        reasoning.push('Efficient asset utilization suggests operational moat');
      }
    }
  }

  // 4. Competitive Position Strength (inferred from trend stability)
  if (historicalRoes.length >= 5 && historicalMargins.length >= 5) {
    // Calculate coefficient of variation (stability measure)
    const roeAvg = historicalRoes.reduce((sum, roe) => sum + roe, 0) / historicalRoes.length;
    const roeVariance =
      historicalRoes.reduce((sum, roe) => sum + Math.pow(roe - roeAvg, 2), 0) /
      historicalRoes.length;
    const roeStability = roeAvg > 0 ? 1 - Math.sqrt(roeVariance) / roeAvg : 0;

    const marginAvg =
      historicalMargins.reduce((sum, margin) => sum + margin, 0) / historicalMargins.length;
    const marginVariance =
      historicalMargins.reduce((sum, margin) => sum + Math.pow(margin - marginAvg, 2), 0) /
      historicalMargins.length;
    const marginStability = marginAvg > 0 ? 1 - Math.sqrt(marginVariance) / marginAvg : 0;

    const overallStability = (roeStability + marginStability) / 2;

    if (overallStability > 0.7) {
      // High stability indicates strong competitive position
      moatScore += 1;
      reasoning.push(
        `High performance stability (${(overallStability * 100).toFixed(1)}%) suggests strong competitive moat`,
      );
    }
  }

  // Cap the score at max_score
  moatScore = Math.min(moatScore, maxScore);

  return {
    score: moatScore,
    max_score: maxScore,
    details: reasoning.length > 0 ? reasoning.join('; ') : 'Limited moat analysis available',
  };
}
function calculateIntrinsicValue(financialLineItems: FinancialLineItem[]): {
  intrinsic_value?: number;
  raw_intrinsic_value?: number;
  owner_earnings?: number;
  assumptions?: any;
  details: string[];
} {
  /**
   * Calculate intrinsic value using enhanced DCF with owner earnings.
   * Uses more sophisticated assumptions and conservative approach like Buffett.
   */
  if (!financialLineItems || financialLineItems.length < 3) {
    return {
      details: ['Insufficient data for reliable valuation'],
    };
  }

  // Calculate owner earnings with better methodology
  const earningsData = calculateOwnerEarnings(financialLineItems);
  if (!earningsData.owner_earnings) {
    return { details: earningsData.details };
  }

  const ownerEarnings = earningsData.owner_earnings;
  const latestFinancialLineItems = financialLineItems[0];
  const sharesOutstanding = latestFinancialLineItems.outstanding_shares;

  if (!sharesOutstanding || sharesOutstanding <= 0) {
    return { details: ['Missing or invalid shares outstanding data'] };
  }

  // Enhanced DCF with more realistic assumptions
  const details: string[] = [];

  // Estimate growth rate based on historical performance (more conservative)
  const historicalEarnings: number[] = [];
  for (const item of financialLineItems.slice(0, 5)) {
    // Last 5 years
    if (item.net_income !== undefined) {
      historicalEarnings.push(item.net_income);
    }
  }

  // Calculate historical growth rate
  let conservativeGrowth = 0.03; // Default conservative growth
  if (historicalEarnings.length >= 3) {
    const oldestEarnings = historicalEarnings[historicalEarnings.length - 1];
    const latestEarnings = historicalEarnings[0];
    const years = historicalEarnings.length - 1;

    if (oldestEarnings > 0) {
      const historicalGrowth = Math.pow(latestEarnings / oldestEarnings, 1 / years) - 1;
      // Conservative adjustment - cap growth and apply haircut
      const cappedGrowth = Math.max(-0.05, Math.min(historicalGrowth, 0.15)); // Cap between -5% and 15%
      conservativeGrowth = cappedGrowth * 0.7; // Apply 30% haircut for conservatism
    }
  }

  // Buffett's conservative assumptions
  const stage1Growth = Math.min(conservativeGrowth, 0.08); // Stage 1: cap at 8%
  const stage2Growth = Math.min(conservativeGrowth * 0.5, 0.04); // Stage 2: half of stage 1, cap at 4%
  const terminalGrowth = 0.025; // Long-term GDP growth rate

  // Risk-adjusted discount rate based on business quality
  const discountRate = 0.1; // Conservative 10%

  // Three-stage DCF model
  const stage1Years = 5; // High growth phase
  const stage2Years = 5; // Transition phase

  let presentValue = 0;
  details.push(
    `Using three-stage DCF: Stage 1 (${(stage1Growth * 100).toFixed(1)}%, ${stage1Years}y), Stage 2 (${(stage2Growth * 100).toFixed(1)}%, ${stage2Years}y), Terminal (${(terminalGrowth * 100).toFixed(1)}%)`,
  );

  // Stage 1: Higher growth
  let stage1Pv = 0;
  for (let year = 1; year <= stage1Years; year++) {
    const futureEarnings = ownerEarnings * Math.pow(1 + stage1Growth, year);
    const pv = futureEarnings / Math.pow(1 + discountRate, year);
    stage1Pv += pv;
  }

  // Stage 2: Transition growth
  let stage2Pv = 0;
  const stage1FinalEarnings = ownerEarnings * Math.pow(1 + stage1Growth, stage1Years);
  for (let year = 1; year <= stage2Years; year++) {
    const futureEarnings = stage1FinalEarnings * Math.pow(1 + stage2Growth, year);
    const pv = futureEarnings / Math.pow(1 + discountRate, stage1Years + year);
    stage2Pv += pv;
  }

  // Terminal value using Gordon Growth Model
  const finalEarnings = stage1FinalEarnings * Math.pow(1 + stage2Growth, stage2Years);
  const terminalEarnings = finalEarnings * (1 + terminalGrowth);
  const terminalValue = terminalEarnings / (discountRate - terminalGrowth);
  const terminalPv = terminalValue / Math.pow(1 + discountRate, stage1Years + stage2Years);

  // Total intrinsic value
  const intrinsicValue = stage1Pv + stage2Pv + terminalPv;

  // Apply additional margin of safety (Buffett's conservatism)
  const conservativeIntrinsicValue = intrinsicValue * 0.85; // 15% additional haircut

  details.push(
    `Stage 1 PV: $${stage1Pv.toLocaleString()}`,
    `Stage 2 PV: $${stage2Pv.toLocaleString()}`,
    `Terminal PV: $${terminalPv.toLocaleString()}`,
    `Total IV: $${intrinsicValue.toLocaleString()}`,
    `Conservative IV (15% haircut): $${conservativeIntrinsicValue.toLocaleString()}`,
    `Owner earnings: $${ownerEarnings.toLocaleString()}`,
    `Discount rate: ${(discountRate * 100).toFixed(1)}%`,
  );

  return {
    intrinsic_value: conservativeIntrinsicValue,
    raw_intrinsic_value: intrinsicValue,
    owner_earnings: ownerEarnings,
    assumptions: {
      stage1_growth: stage1Growth,
      stage2_growth: stage2Growth,
      terminal_growth: terminalGrowth,
      discount_rate: discountRate,
      stage1_years: stage1Years,
      stage2_years: stage2Years,
      historical_growth: conservativeGrowth,
    },
    details: details,
  };
}
function analyzeManagementQuality(financialLineItems: FinancialLineItem[]): {
  score: number;
  max_score: number;
  details: string;
} {
  /**
   * Checks for share dilution or consistent buybacks, and some dividend track record.
   * A simplified approach:
   *   - if there's net share repurchase or stable share count, it suggests management
   *     might be shareholder-friendly.
   *   - if there's a big new issuance, it might be a negative sign (dilution).
   */
  if (!financialLineItems || financialLineItems.length === 0) {
    return {
      score: 0,
      max_score: 2,
      details: 'Insufficient data for management analysis',
    };
  }

  const reasoning: string[] = [];
  let mgmtScore = 0;

  const latest = financialLineItems[0];

  if (
    latest.issuance_or_purchase_of_equity_shares !== undefined &&
    latest.issuance_or_purchase_of_equity_shares < 0
  ) {
    // Negative means the company spent money on buybacks
    mgmtScore += 1;
    reasoning.push('Company has been repurchasing shares (shareholder-friendly)');
  }

  if (
    latest.issuance_or_purchase_of_equity_shares !== undefined &&
    latest.issuance_or_purchase_of_equity_shares > 0
  ) {
    // Positive issuance means new shares => possible dilution
    reasoning.push('Recent common stock issuance (potential dilution)');
  } else {
    reasoning.push('No significant new stock issuance detected');
  }

  // Check for any dividends
  if (
    latest.dividends_and_other_cash_distributions !== undefined &&
    latest.dividends_and_other_cash_distributions < 0
  ) {
    mgmtScore += 1;
    reasoning.push('Company has a track record of paying dividends');
  } else {
    reasoning.push('No or minimal dividends paid');
  }

  return {
    score: mgmtScore,
    max_score: 2,
    details: reasoning.join('; '),
  };
}

function calculateOwnerEarnings(financialLineItems: FinancialLineItem[]): {
  owner_earnings: number | null;
  details: string[];
  components?: any;
} {
  /**
   * Calculate owner earnings (Buffett's preferred measure of true earnings power).
   * Enhanced methodology: Net Income + Depreciation/Amortization - Maintenance CapEx - Working Capital Changes
   * Uses multi-period analysis for better maintenance capex estimation.
   */
  if (!financialLineItems || financialLineItems.length < 2) {
    return {
      owner_earnings: null,
      details: ['Insufficient data for owner earnings calculation'],
    };
  }

  const latest = financialLineItems[0];
  const details: string[] = [];

  // Core components
  const netIncome = latest.net_income;
  const depreciation = latest.depreciation_and_amortization;
  const capex = latest.capital_expenditure;

  if (netIncome === undefined || depreciation === undefined || capex === undefined) {
    const missing: string[] = [];
    if (netIncome === undefined) missing.push('net income');
    if (depreciation === undefined) missing.push('depreciation');
    if (capex === undefined) missing.push('capital expenditure');
    return {
      owner_earnings: null,
      details: [`Missing components: ${missing.join(', ')}`],
    };
  }

  // Enhanced maintenance capex estimation using historical analysis
  const maintenanceCapex = estimateMaintenanceCapex(financialLineItems);

  // Working capital change analysis (if data available)
  let workingCapitalChange = 0;
  if (financialLineItems.length >= 2) {
    try {
      const currentAssetsCurrent = latest.total_assets;
      const currentLiabCurrent = latest.total_liabilities;

      const previous = financialLineItems[1];
      const currentAssetsPrevious = previous.total_assets;
      const currentLiabPrevious = previous.total_liabilities;

      if (
        currentAssetsCurrent !== undefined &&
        currentLiabCurrent !== undefined &&
        currentAssetsPrevious !== undefined &&
        currentLiabPrevious !== undefined
      ) {
        const wcCurrent = currentAssetsCurrent - currentLiabCurrent;
        const wcPrevious = currentAssetsPrevious - currentLiabPrevious;
        workingCapitalChange = wcCurrent - wcPrevious;
        details.push(`Working capital change: $${workingCapitalChange.toLocaleString()}`);
      }
    } catch {
      // Skip working capital adjustment if data unavailable
    }
  }

  function estimateMaintenanceCapex(financialLineItems: FinancialLineItem[]): number {
    /**
     * Estimate maintenance capital expenditure using multiple approaches.
     * Buffett considers this crucial for understanding true owner earnings.
     */
    if (!financialLineItems || financialLineItems.length === 0) {
      return 0;
    }

    // Approach 1: Historical average as % of revenue
    const capexRatios: number[] = [];
    const depreciationValues: number[] = [];

    for (const item of financialLineItems.slice(0, 5)) {
      // Last 5 periods
      if (item.capital_expenditure !== undefined && item.revenue !== undefined) {
        if (item.revenue > 0) {
          const capexRatio = Math.abs(item.capital_expenditure) / item.revenue;
          capexRatios.push(capexRatio);
        }
      }

      if (item.depreciation_and_amortization !== undefined) {
        depreciationValues.push(item.depreciation_and_amortization);
      }
    }

    // Approach 2: Percentage of depreciation (typically 80-120% for maintenance)
    const latestDepreciation = financialLineItems[0].depreciation_and_amortization || 0;

    // Approach 3: Industry-specific heuristics
    const latestCapex = Math.abs(financialLineItems[0].capital_expenditure || 0);

    // Conservative estimate: Use the higher of:
    // 1. 85% of total capex (assuming 15% is growth capex)
    // 2. 100% of depreciation (replacement of worn-out assets)
    // 3. Historical average if stable

    const method1 = latestCapex * 0.85; // 85% of total capex
    const method2 = latestDepreciation; // 100% of depreciation

    // If we have historical data, use average capex ratio
    if (capexRatios.length >= 3) {
      const avgCapexRatio = capexRatios.reduce((sum, ratio) => sum + ratio, 0) / capexRatios.length;
      const latestRevenue = financialLineItems[0].revenue || 0;
      const method3 = avgCapexRatio * latestRevenue;

      // Use the median of the three approaches for conservatism
      const estimates = [method1, method2, method3].sort((a, b) => a - b);
      return estimates[1]; // Median
    } else {
      // Use the higher of method 1 and 2
      return Math.max(method1, method2);
    }
  }
  // Calculate owner earnings
  const ownerEarnings = netIncome + depreciation - maintenanceCapex - workingCapitalChange;

  // Sanity checks
  if (ownerEarnings < netIncome * 0.3) {
    // Owner earnings shouldn't be less than 30% of net income typically
    details.push('Warning: Owner earnings significantly below net income - high capex intensity');
  }

  if (maintenanceCapex > depreciation * 2) {
    // Maintenance capex shouldn't typically exceed 2x depreciation
    details.push('Warning: Estimated maintenance capex seems high relative to depreciation');
  }

  details.push(
    `Net income: $${netIncome.toLocaleString()}`,
    `Depreciation: $${depreciation.toLocaleString()}`,
    `Estimated maintenance capex: $${maintenanceCapex.toLocaleString()}`,
    `Owner earnings: $${ownerEarnings.toLocaleString()}`,
  );

  return {
    owner_earnings: ownerEarnings,
    components: {
      net_income: netIncome,
      depreciation: depreciation,
      maintenance_capex: maintenanceCapex,
      working_capital_change: workingCapitalChange,
      total_capex: Math.abs(capex),
    },
    details: details,
  };
}

function analyzeBookValueGrowth(financialLineItems: FinancialLineItem[]): {
  score: number;
  details: string;
} {
  /** Analyze book value per share growth - a key Buffett metric. */
  if (financialLineItems.length < 3) {
    return { score: 0, details: 'Insufficient data for book value analysis' };
  }

  // Extract book values per share
  const bookValues = financialLineItems
    .filter(
      (item) =>
        item.shareholders_equity !== undefined &&
        item.outstanding_shares !== undefined &&
        item.shareholders_equity !== null &&
        item.outstanding_shares !== null &&
        item.outstanding_shares > 0,
    )
    .map((item) => item.shareholders_equity! / item.outstanding_shares!);

  if (bookValues.length < 3) {
    return { score: 0, details: 'Insufficient book value data for growth analysis' };
  }

  let score = 0;
  const reasoning: string[] = [];

  // Analyze growth consistency
  const growthPeriods = bookValues.filter((value, index) => {
    if (index === bookValues.length - 1) return false;
    return value > bookValues[index + 1];
  }).length;
  const growthRate = growthPeriods / (bookValues.length - 1);

  // Score based on consistency
  if (growthRate >= 0.8) {
    score += 3;
    reasoning.push("Consistent book value per share growth (Buffett's favorite metric)");
  } else if (growthRate >= 0.6) {
    score += 2;
    reasoning.push('Good book value per share growth pattern');
  } else if (growthRate >= 0.4) {
    score += 1;
    reasoning.push('Moderate book value per share growth');
  } else {
    reasoning.push('Inconsistent book value per share growth');
  }

  // Calculate and score CAGR
  const [cagrScore, cagrReason] = calculateBookValueCAGR(bookValues);
  score += cagrScore;
  reasoning.push(cagrReason);

  return { score: score, details: reasoning.join('; ') };
}

function calculateBookValueCAGR(bookValues: number[]): [number, string] {
  /** Helper function to safely calculate book value CAGR and return score + reasoning. */
  if (bookValues.length < 2) {
    return [0, 'Insufficient data for CAGR calculation'];
  }

  const oldestBV = bookValues[bookValues.length - 1];
  const latestBV = bookValues[0];
  const years = bookValues.length - 1;

  // Handle different scenarios
  if (oldestBV > 0 && latestBV > 0) {
    const cagr = Math.pow(latestBV / oldestBV, 1 / years) - 1;
    if (cagr > 0.15) {
      return [2, `Excellent book value CAGR: ${(cagr * 100).toFixed(1)}%`];
    } else if (cagr > 0.1) {
      return [1, `Good book value CAGR: ${(cagr * 100).toFixed(1)}%`];
    } else {
      return [0, `Book value CAGR: ${(cagr * 100).toFixed(1)}%`];
    }
  } else if (oldestBV < 0 && latestBV > 0) {
    return [3, 'Excellent: Company improved from negative to positive book value'];
  } else if (oldestBV > 0 && latestBV < 0) {
    return [0, 'Warning: Company declined from positive to negative book value'];
  } else {
    return [0, 'Unable to calculate meaningful book value CAGR due to negative values'];
  }
}

function analyzePricingPower(
  financialLineItems: FinancialLineItem[],
  metrics: FinancialMetrics[],
): {
  score: number;
  details: string;
} {
  /**
   * Analyze pricing power - Buffett's key indicator of a business moat.
   * Looks at ability to raise prices without losing customers (margin expansion during inflation).
   */
  if (!financialLineItems || !metrics) {
    return { score: 0, details: 'Insufficient data for pricing power analysis' };
  }

  let score = 0;
  const reasoning: string[] = [];

  // Check gross margin trends (ability to maintain/expand margins)
  const grossMargins = financialLineItems
    .filter((item) => item.gross_margin !== undefined)
    .map((item) => item.gross_margin!);

  if (grossMargins.length >= 3) {
    // Check margin stability/improvement
    const recentAvg =
      grossMargins.slice(0, 2).reduce((sum, margin) => sum + margin, 0) /
      Math.min(2, grossMargins.length);
    const olderAvg =
      grossMargins.slice(-2).reduce((sum, margin) => sum + margin, 0) /
      Math.min(2, grossMargins.length);

    if (recentAvg > olderAvg + 0.02) {
      // 2%+ improvement
      score += 3;
      reasoning.push('Expanding gross margins indicate strong pricing power');
    } else if (recentAvg > olderAvg) {
      score += 2;
      reasoning.push('Improving gross margins suggest good pricing power');
    } else if (Math.abs(recentAvg - olderAvg) < 0.01) {
      // Stable within 1%
      score += 1;
      reasoning.push('Stable gross margins during economic uncertainty');
    } else {
      reasoning.push('Declining gross margins may indicate pricing pressure');
    }
  }

  // Check if company has been able to maintain high margins consistently
  if (grossMargins.length > 0) {
    const avgMargin = grossMargins.reduce((sum, margin) => sum + margin, 0) / grossMargins.length;
    if (avgMargin > 0.5) {
      // 50%+ gross margins
      score += 2;
      reasoning.push(
        `Consistently high gross margins (${(avgMargin * 100).toFixed(1)}%) indicate strong pricing power`,
      );
    } else if (avgMargin > 0.3) {
      // 30%+ gross margins
      score += 1;
      reasoning.push(
        `Good gross margins (${(avgMargin * 100).toFixed(1)}%) suggest decent pricing power`,
      );
    }
  }

  return {
    score: score,
    details:
      reasoning.length > 0 ? reasoning.join('; ') : 'Limited pricing power analysis available',
  };
}

export async function fundamentalAnalysis({
  tickers,
  endDateStr,
}: {
  tickers: string[];
  endDateStr: string;
}) {
  const endDate = endDateStr;

  const analysisData: Record<string, AnalysisData> = {};
  const buffettAnalysis: Record<string, any> = {};

  for (const ticker of tickers) {
    // 在这里处理每个股票代码
    const metrics = await getFinancialMetrics(ticker, endDate);
    const financialLineItems = await searchLineItems(
      ticker,
      [
        'capital_expenditure',
        'depreciation_and_amortization',
        'net_income',
        'outstanding_shares',
        'total_assets',
        'total_liabilities',
        'shareholders_equity',
        'dividends_and_other_cash_distributions',
        'issuance_or_purchase_of_equity_shares',
        'gross_profit',
        'revenue',
        'free_cash_flow',
      ],
      endDate,
    );
    const marketCap = await getMarketCap(ticker, endDate);
    const fundamentalAnalysis = analyzeFundamentals(metrics);
    const consistencyAnalysis = analyzeConsistency(financialLineItems);
    const moatAnalysis = analyzeMoat(metrics);
    const pricingPowerAnalysis = analyzePricingPower(financialLineItems, metrics);
    const bookValueAnalysis = analyzeBookValueGrowth(financialLineItems);
    const mgmtAnalysis = analyzeManagementQuality(financialLineItems);
    const intrinsicValueAnalysis = calculateIntrinsicValue(financialLineItems);

    const totalScore =
      fundamentalAnalysis.score +
      consistencyAnalysis.score +
      moatAnalysis.score +
      mgmtAnalysis.score +
      pricingPowerAnalysis.score +
      bookValueAnalysis.score;

    // Update max possible score calculation
    const maxPossibleScore =
      10 + // fundamental_analysis (ROE, debt, margins, current ratio)
      moatAnalysis.max_score +
      mgmtAnalysis.max_score +
      5 + // pricing_power (0-5)
      5; // book_value_growth (0-5)

    // Add margin of safety analysis if we have both intrinsic value and current price
    let marginOfSafety: number | null = null;
    const intrinsicValue = intrinsicValueAnalysis.intrinsic_value;
    if (intrinsicValue && marketCap) {
      marginOfSafety = (intrinsicValue - marketCap) / marketCap;
    }

    // Combine all analysis results for LLM evaluation
    analysisData[ticker] = {
      ticker,
      score: totalScore,
      max_score: maxPossibleScore,
      fundamental_analysis: fundamentalAnalysis,
      consistency_analysis: consistencyAnalysis,
      moat_analysis: moatAnalysis,
      pricing_power_analysis: pricingPowerAnalysis,
      book_value_analysis: bookValueAnalysis,
      management_analysis: mgmtAnalysis,
      intrinsic_value_analysis: intrinsicValueAnalysis,
      market_cap: marketCap,
      margin_of_safety: marginOfSafety,
    };

    const buffettOutput = await generateBuffettOutput(ticker, analysisData[ticker]);
    buffettAnalysis[ticker] = {
      signal: buffettOutput.signal,
      confidence: buffettOutput.confidence,
      reasoning: buffettOutput.reasoning,
    };
  }

  return buffettAnalysis;
}

async function generateBuffettOutput(
  ticker: string,
  analysisData: AnalysisData,
): Promise<WarrenBuffettSignal> {
  /** Get investment decision from LLM with a compact prompt. */

  // Build compact facts here
  const facts = {
    score: analysisData.score,
    max_score: analysisData.max_score,
    fundamentals: analysisData.fundamental_analysis.details,
    consistency: analysisData.consistency_analysis.details,
    moat: analysisData.moat_analysis.details,
    pricing_power: analysisData.pricing_power_analysis.details,
    book_value: analysisData.book_value_analysis.details,
    management: analysisData.management_analysis.details,
    intrinsic_value: analysisData.intrinsic_value_analysis.intrinsic_value,
    market_cap: analysisData.market_cap,
    margin_of_safety: analysisData.margin_of_safety,
  };

  const prompt = {
    system: `You are Warren Buffett. Decide bullish, bearish, or neutral using only the provided facts.

Checklist for decision:
- Circle of competence
- Competitive moat
- Management quality
- Financial strength
- Valuation vs intrinsic value
- Long-term prospects

Signal rules:
- Bullish: strong business AND margin_of_safety > 0.
- Bearish: poor business OR clearly overvalued.
- Neutral: good business but margin_of_safety <= 0, or mixed evidence.

Confidence scale:
- 90-100%: Exceptional business within my circle, trading at attractive price
- 70-89%: Good business with decent moat, fair valuation
- 50-69%: Mixed signals, would need more information or better price
- 30-49%: Outside my expertise or concerning fundamentals
- 10-29%: Poor business or significantly overvalued

Keep reasoning under 120 characters. Do not invent data. Return JSON only.`,
    human: `Ticker: ${ticker}
Facts:
${JSON.stringify(facts, null, 2)}

Return exactly:
{
  "signal": "bullish" | "bearish" | "neutral",
  "confidence": int,
  "reasoning": "short justification"
}`,
  };

  const llm = chatModelOpenAI();
  logger.info('[WarrenBuffettAgent] prompt %s', prompt.system + prompt.human);
  const response = await llm.invoke([
    new SystemMessage(prompt.system),
    new HumanMessage(prompt.human),
  ]);

  logger.info('[WarrenBuffettAgent] response %s', response.content);

  const json = extractJsonFromText(response.content as string);
  let signal: WarrenBuffettSignal | undefined = {
    signal: 'unknown',
    confidence: 50,
    reasoning: 'Insufficient data',
  };
  if (json.success) {
    signal = json.data as WarrenBuffettSignal;
  }

  return signal;
}
