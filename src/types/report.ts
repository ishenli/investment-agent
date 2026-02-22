/**
 * Report Generation Types
 * 
 * Type definitions for enhanced report generation feature including:
 * - Performance calculation
 * - Enriched positions with real-time data
 * - Report generation progress tracking
 * - Data source summary
 */

/**
 * Performance calculation result for a specific time period
 */
export interface PerformanceCalculation {
  /** Starting value at the beginning of the period (in cents) */
  startValueCents: number;
  /** Ending value at the end of the period (in cents) */
  endValueCents: number;
  /** Absolute gain/loss amount (in cents) */
  changeAmountCents: number;
  /** Percentage return */
  changePercentage: number;
  
  /** Benchmark return for comparison (nullable if data unavailable) */
  benchmarkReturn: number | null;
  /** Excess return over benchmark (nullable if benchmark unavailable) */
  excessReturn: number | null;
  
  /** Time-weighted return (TWR) accounting for cash flows */
  timeWeightedReturn?: number;
  /** Total deposits during the period (in cents) */
  totalDepositCents?: number;
  /** Total withdrawals during the period (in cents) */
  totalWithdrawalCents?: number;
  /** Net cash flow (deposits - withdrawals, in cents) */
  netCashFlowCents?: number;
  
  /** Optional risk metrics */
  maxDrawdown?: number;
  volatility?: number;
}

/**
 * Position enriched with real-time market data
 */
export interface EnrichedPosition {
  /** Stock symbol */
  symbol: string;
  /** Quantity held */
  quantity: number;
  /** Average cost basis (in cents) */
  averagePriceCents: number;
  /** Current price from position data (in cents) */
  currentPriceCents: number;
  /** Market value (in cents) */
  marketValueCents: number;
  /** Unrealized gain/loss (in cents) */
  unrealizedGainLossCents: number;
  
  /** Real-time price from quote API (in cents) */
  realtimePrice: number;
  /** Price change percentage from real-time quote */
  priceChangePercent: number;
  /** Timestamp of last quote update */
  lastQuoteUpdate: Date | null;
  /** Data staleness in milliseconds */
  dataStaleness: number;
  
  /** Optional sector classification */
  sector?: string;
}

/**
 * Report generation progress tracking
 */
export interface ReportGenerationProgress {
  /** Progress percentage (0-100) */
  progress: number;
  /** Current stage description */
  stage: 'data_aggregation' | 'performance_calculation' | 'ai_generation' | 'formatting' | 'completed';
  /** Stage display name in Chinese */
  stageDisplayName: string;
}

/**
 * Data source summary for transparency
 */
export interface DataSourceSummary {
  /** Data sources used */
  sources: DataSource[];
  /** Overall data freshness score (0-1) */
  freshnessScore: number;
  /** Generation timestamp */
  generatedAt: Date;
}

/**
 * Individual data source information
 */
export interface DataSource {
  /** Source type */
  type: 'position' | 'transaction' | 'quote' | 'note' | 'search' | 'benchmark';
  /** Source name or provider */
  source: string;
  /** Last update timestamp */
  lastUpdate: Date | null;
  /** Data staleness in milliseconds */
  staleness: number;
  /** Whether data is considered stale (> 1 hour) */
  isStale: boolean;
}

/**
 * Structured report output schema (for AI generation)
 */
export interface StructuredReportOutput {
  /** Executive summary */
  summary: string;
  /** Market overview section */
  marketOverview: string;
  /** Individual position analyses */
  positionAnalysis: PositionAnalysis[];
  /** Risk warnings */
  riskWarnings: string[];
  /** Next week outlook */
  nextWeekOutlook: string;
}

/**
 * Analysis for a single position
 */
export interface PositionAnalysis {
  /** Stock symbol */
  symbol: string;
  /** Analysis content */
  analysis: string;
  /** Recommendation (optional) */
  recommendation?: 'buy' | 'hold' | 'sell';
}

/**
 * Extended analysis report with new metadata fields
 */
export interface ExtendedAnalysisReport {
  id: number;
  accountId: number;
  title: string;
  content: string;
  
  /** Generation progress (0-100) */
  generationProgress: number;
  /** Current generation stage */
  generationStage: string | null;
  /** Data source summary (JSON) */
  dataSourceSummary: string | null;
  
  /** Manual editing metadata (P1 compatibility) */
  isManuallyEdited: boolean;
  lastEditedAt: Date | null;
  editCount: number;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Report generation request parameters
 */
export interface GenerateReportRequest {
  /** Account ID */
  accountId: number;
  /** Report time range start date */
  startDate: Date;
  /** Report time range end date */
  endDate: Date;
  /** Optional custom title */
  title?: string;
  /** Whether to include benchmark comparison */
  includeBenchmark?: boolean;
}

/**
 * Report aggregation data (input for AI generation)
 */
export interface ReportAggregationData {
  /** Account information */
  account: {
    id: number;
    name: string;
  };
  
  /** Time range */
  timeRange: {
    startDate: Date;
    endDate: Date;
  };
  
  /** Performance metrics */
  performance: PerformanceCalculation;
  
  /** Enriched positions */
  positions: EnrichedPosition[];
  
  /** Recent transactions */
  transactions: any[]; // TODO: Type this properly
  
  /** User notes in the period */
  notes: any[]; // TODO: Type this properly
  
  /** Investment memos */
  memos: any[]; // TODO: Type this properly
  
  /** Market events (from search) */
  marketEvents?: any[]; // TODO: Type this properly
  
  /** Data source summary */
  dataSourceSummary: DataSourceSummary;
}
