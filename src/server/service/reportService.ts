import logger from '@server/base/logger';
import transactionService from './transactionService';
import noteService from './noteService';
import assetMarketInfoService from './assetMarketInfoService';
import assetMetaService from './assetMetaService';
import positionService from './positionService';
import authService from './authService';
import portfolioSnapshotService from './portfolioSnapshotService';
import { transactionRepository, type CashFlow } from '../repository/transactionRepository';
import { accountRepository } from '../repository/accountRepository';
import { analysisReportRepository, type AnalysisReportEntity } from '../repository/analysisReportRepository';
import { unifiedPriceService, type QuoteResponse } from './unifiedPriceService';
import { AssetMarketInfoType } from '@/types/marketInfo';
import { NoteType } from './noteService';
import { PositionType } from '@typings/position';
import { AssetMetaType } from '@/types/assetMeta';
import {
  PerformanceCalculation,
  EnrichedPosition,
  DataSourceSummary,
  DataSource,
} from '@/types/report';
import { chatModelOpenAI } from '@server/core/provider/chatModel';
import { SystemMessage, HumanMessage } from 'langchain';
import { recordPrompt } from '../utils/file';
import { createAgent } from 'langchain';
import {
  noteQueryTool,
  stockRecallCompanyInfoTool,
  stockSearchNewsTool,
  TravilySearchTool,
} from '../core/tools';

// 报告类型枚举
export type ReportType = 'weekly' | 'monthly' | 'emergency';

// 报告状态枚举
export type ReportStatus = 'pending' | 'processing' | 'completed' | 'failed';

// 生成报告请求类型
export type GenerateReportRequest = {
  accountId: string;
  type: ReportType;
  startDate?: Date;
  endDate?: Date;
  modelSlug?: string; // 可选的模型标识，用于选择特定的 AI 模型
};

// 报告列表项类型
export type ReportListItem = {
  id: string;
  title: string;
  type: ReportType;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
};

// 报告详情类型
export type ReportDetail = {
  id: string;
  accountId: string;
  type: ReportType;
  title: string;
  content: string;
  startDate: Date | null;
  endDate: Date | null;
  // 报告生成进度
  generationProgress: number;
  generationStage: string | null;
  // 数据来源摘要
  dataSourceSummary: string | null;
  // 手动编辑标记
  isManuallyEdited: boolean;
  lastEditedAt: Date | null;
  editCount: number;
  createdAt: Date;
  updatedAt: Date;
};

// 本周业绩数据类型
export type WeeklyPerformance = {
  totalValue: number;
  previousValue: number;
  changeAmount: number;
  changePercentage: number;
  benchmarkPerformance?: number;
  maxDrawdown?: number;
  sharpeRatio?: number;
};

// 持仓变化数据类型
export type PositionChange = {
  symbol: string;
  currentQuantity: number;
  averageCost: number;
  currentPrice: number;
  changePercentage: number;
  contribution: number;
};

// 周报数据聚合类型
export type WeeklyReportData = {
  performance: WeeklyPerformance;
  enrichedPositions?: EnrichedPosition[];
  transactions: any[]; // 使用 any 以避免循环依赖，实际应为 TransactionRecordType
  marketEvents: AssetMarketInfoType[];
  notes: NoteType[];
  investmentMemos: AssetMetaType[];
  dataSourceSummary?: DataSourceSummary;
};

export class ReportService {
  constructor() {
    // 数据库连接已经在 db.ts 中初始化
  }

  /**
   * Calculate performance for a specific time period
   * @param accountId Account ID
   * @param startDate Period start date
   * @param endDate Period end date
   * @param benchmarkSymbol Benchmark symbol for comparison (default: SPY)
   * @returns Performance calculation result
   */
  async calculatePerformance(
    accountId: string,
    startDate: Date,
    endDate: Date,
    benchmarkSymbol: string = 'SPY',
  ): Promise<PerformanceCalculation> {
    try {
      const accountIdNum = parseInt(accountId);

      // Get start and end snapshots
      const startSnapshot = await portfolioSnapshotService.getNearestSnapshot(accountIdNum, startDate);
      const endSnapshot = await portfolioSnapshotService.getNearestSnapshot(accountIdNum, endDate);

      // If no snapshots available, calculate from current positions
      if (!startSnapshot && !endSnapshot) {
        logger.warn(`No snapshots found for account ${accountId}, returning zero performance`);
        return this.getZeroPerformance();
      }

      // Get cash flows during the period
      const cashFlows = await this.getCashFlows(accountIdNum, startDate, endDate);

      // Calculate values
      const startValueCents = startSnapshot?.totalValueCents ?? 0;
      const endValueCents = endSnapshot?.totalValueCents ?? 0;

      // Calculate simple return
      const changeAmountCents = endValueCents - startValueCents;
      const changePercentage = startValueCents > 0
        ? (changeAmountCents / startValueCents) * 100
        : 0;

      // Calculate Time-Weighted Return (TWR) if there are cash flows
      let timeWeightedReturn: number | undefined;
      if (cashFlows.length > 0 && startSnapshot && endSnapshot) {
        timeWeightedReturn = await this.calculateTWR(
          accountIdNum,
          startDate,
          endDate,
          startValueCents,
          endValueCents,
          cashFlows,
        );
      }

      // Calculate cash flow summary using repository
      const cashFlowSummary = await transactionRepository.getTotalDepositsAndWithdrawals(
        accountIdNum,
        startDate,
        endDate,
      );

      // Get benchmark return
      const benchmarkReturn = await this.getBenchmarkReturn(startDate, endDate, benchmarkSymbol);
      const excessReturn = benchmarkReturn !== null
        ? changePercentage - benchmarkReturn
        : null;

      return {
        startValueCents,
        endValueCents,
        changeAmountCents,
        changePercentage,
        benchmarkReturn,
        excessReturn,
        timeWeightedReturn,
        totalDepositCents: cashFlowSummary.totalDepositCents,
        totalWithdrawalCents: cashFlowSummary.totalWithdrawalCents,
        netCashFlowCents: cashFlowSummary.totalDepositCents - cashFlowSummary.totalWithdrawalCents,
      };
    } catch (error) {
      logger.error(`[ReportService] Failed to calculate performance for account ${accountId}: ${error}`);
      return this.getZeroPerformance();
    }
  }

  /**
   * Get cash flows (deposits and withdrawals) for a period
   * @param accountId Account ID
   * @param startDate Start date
   * @param endDate End date
   * @returns Array of cash flows
   */
  private async getCashFlows(
    accountId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<CashFlow[]> {
    try {
      return await transactionRepository.getCashFlows(accountId, startDate, endDate);
    } catch (error) {
      logger.error(`[ReportService] Failed to get cash flows: ${error}`);
      return [];
    }
  }

  /**
   * Calculate Time-Weighted Return (TWR)
   * @param accountId Account ID
   * @param startDate Start date
   * @param endDate End date
   * @param startValue Starting value
   * @param endValue Ending value
   * @param cashFlows Cash flows during the period
   * @returns TWR percentage
   */
  private async calculateTWR(
    accountId: number,
    startDate: Date,
    endDate: Date,
    startValue: number,
    endValue: number,
    cashFlows: Array<{ type: 'deposit' | 'withdrawal'; amountCents: number; date: Date }>,
  ): Promise<number> {
    try {
      if (cashFlows.length === 0) {
        // Simple return if no cash flows
        return startValue > 0 ? ((endValue - startValue) / startValue) * 100 : 0;
      }

      // Sort cash flows by date
      const sortedCashFlows = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());

      // Calculate sub-period returns
      let previousValue = startValue;
      let twrProduct = 1;
      let lastDate = startDate;

      for (const cf of sortedCashFlows) {
        // Get snapshot value before cash flow
        const snapshotBeforeCF = await portfolioSnapshotService.getNearestSnapshot(accountId, cf.date);

        // Value at cash flow time (approximate)
        const valueAtCF = snapshotBeforeCF?.totalValueCents ?? previousValue;

        // Calculate sub-period return
        const subPeriodReturn = previousValue > 0
          ? (valueAtCF - previousValue) / previousValue
          : 0;

        twrProduct *= (1 + subPeriodReturn);

        // Adjust for cash flow
        if (cf.type === 'deposit') {
          previousValue = valueAtCF + cf.amountCents;
        } else {
          previousValue = valueAtCF - cf.amountCents;
        }

        lastDate = cf.date;
      }

      // Final sub-period return (from last cash flow to end)
      const finalReturn = previousValue > 0
        ? (endValue - previousValue) / previousValue
        : 0;
      twrProduct *= (1 + finalReturn);

      // TWR = Product of (1 + R_i) - 1
      const twr = (twrProduct - 1) * 100;

      return twr;
    } catch (error) {
      logger.error(`[ReportService] Failed to calculate TWR: ${error}`);
      return 0;
    }
  }

  /**
   * Get benchmark return for a period
   * @param startDate Start date
   * @param endDate End date
   * @param symbol Benchmark symbol (default: SPY)
   * @returns Benchmark return percentage or null if unavailable
   */
  private async getBenchmarkReturn(
    startDate: Date,
    endDate: Date,
    symbol: string = 'SPY',
  ): Promise<number | null> {
    try {
      // Use the priceService to get historical prices
      // For now, we'll use the snapshot data which includes benchmark values
      // In a full implementation, this would fetch from a market data API

      // Get snapshots for a dummy account to access benchmark data
      // This is a simplified approach - ideally we'd have a dedicated benchmark service
      const priceService = (await import('./priceService')).default;

      const startPrice = await priceService.getLatestPrice(symbol);
      const endPrice = await priceService.getLatestPrice(symbol);

      if (!startPrice || !endPrice) {
        logger.warn(`[ReportService] Could not get benchmark prices for ${symbol}`);
        return null;
      }

      // Since we only have current prices, we can't calculate historical return
      // In production, this would use historical price data
      // For now, return null to indicate unavailability
      return null;
    } catch (error) {
      logger.error(`[ReportService] Failed to get benchmark return: ${error}`);
      return null;
    }
  }

  /**
   * Return zero performance calculation
   * @returns Zero performance object
   */
  private getZeroPerformance(): PerformanceCalculation {
    return {
      startValueCents: 0,
      endValueCents: 0,
      changeAmountCents: 0,
      changePercentage: 0,
      benchmarkReturn: null,
      excessReturn: null,
    };
  }

  /**
   * Enrich positions with real-time market data
   * @param positions Array of positions to enrich
   * @returns Enriched positions with real-time prices
   */
  async enrichWithRealtimeData(positions: PositionType[]): Promise<EnrichedPosition[]> {
    if (positions.length === 0) {
      return [];
    }

    try {
      // Build quote requests from positions
      const quoteRequests = positions.map((pos) => ({
        symbol: pos.symbol,
        market: pos.market || 'US' as const,
      }));

      // Batch fetch quotes using unifiedPriceService
      const result = await unifiedPriceService.batchGetQuote(quoteRequests);

      // Create a map for quick lookup
      const quoteMap = new Map<string, QuoteResponse>();
      for (const quote of result.succeeded) {
        quoteMap.set(quote.symbol, quote);
      }

      // Log any failed quotes
      for (const failed of result.failed) {
        logger.warn(`[ReportService] Failed to get quote for ${failed.symbol}: ${failed.error}`);
      }

      // Enrich positions with real-time data
      const now = new Date();
      return positions.map((pos) => {
        const quote = quoteMap.get(pos.symbol);
        const realtimePrice = quote?.price ?? pos.currentPrice;
        const lastQuoteUpdate = quote?.timestamp ?? null;
        const dataStaleness = this.calculateStaleness(lastQuoteUpdate, now);

        return {
          symbol: pos.symbol,
          quantity: pos.quantity,
          averagePriceCents: Math.round(pos.averageCost * 100),
          currentPriceCents: Math.round(pos.currentPrice * 100),
          marketValueCents: Math.round(pos.marketValue * 100),
          unrealizedGainLossCents: Math.round(pos.unrealizedPnL * 100),
          realtimePrice: Math.round(realtimePrice * 100),
          priceChangePercent: 0, // Would need additional quote data
          lastQuoteUpdate,
          dataStaleness,
        };
      });
    } catch (error) {
      logger.error(`[ReportService] Failed to enrich positions with real-time data: ${error}`);
      // Return positions with stale data indication
      return positions.map((pos) => ({
        symbol: pos.symbol,
        quantity: pos.quantity,
        averagePriceCents: Math.round(pos.averageCost * 100),
        currentPriceCents: Math.round(pos.currentPrice * 100),
        marketValueCents: Math.round(pos.marketValue * 100),
        unrealizedGainLossCents: Math.round(pos.unrealizedPnL * 100),
        realtimePrice: Math.round(pos.currentPrice * 100),
        priceChangePercent: 0,
        lastQuoteUpdate: null,
        dataStaleness: Infinity,
      }));
    }
  }

  /**
   * Calculate data staleness in milliseconds
   * @param timestamp Data timestamp
   * @param now Current time (optional, defaults to now)
   * @returns Staleness in milliseconds
   */
  calculateStaleness(timestamp: Date | null, now: Date = new Date()): number {
    if (!timestamp) {
      return Infinity;
    }
    return now.getTime() - new Date(timestamp).getTime();
  }

  /**
   * Validate data freshness and return summary
   * @param dataSources Array of data sources to validate
   * @returns Data source summary
   */
  validateDataFreshness(dataSources: DataSource[]): DataSourceSummary {
    const now = new Date();
    const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

    // Mark stale data sources
    const processedSources = dataSources.map((source) => {
      const staleness = this.calculateStaleness(source.lastUpdate, now);
      return {
        ...source,
        staleness,
        isStale: staleness > STALE_THRESHOLD_MS,
      };
    });

    // Calculate freshness score (0-1)
    // Lower average staleness = higher score
    const validStaleness = processedSources
      .filter((s) => s.staleness !== Infinity)
      .map((s) => s.staleness);

    let freshnessScore = 1;
    if (validStaleness.length > 0) {
      const avgStaleness = validStaleness.reduce((a, b) => a + b, 0) / validStaleness.length;
      // Normalize: 0 staleness = 1, 1 hour staleness = 0.5, 2+ hours = 0
      freshnessScore = Math.max(0, 1 - avgStaleness / (2 * STALE_THRESHOLD_MS));
    }

    return {
      sources: processedSources,
      freshnessScore,
      generatedAt: now,
    };
  }

  /**
   * Build data source summary for report
   * @param positions Enriched positions
   * @param transactions Transaction data
   * @param notes Note data
   * @param marketEvents Market events
   * @returns Data source summary
   */
  private buildDataSourceSummary(
    positions: EnrichedPosition[],
    transactions: any[],
    notes: NoteType[],
    marketEvents: AssetMarketInfoType[],
  ): DataSourceSummary {
    const now = new Date();
    const dataSources: DataSource[] = [];

    // Position data source
    const positionTimestamps = positions
      .map((p) => p.lastQuoteUpdate)
      .filter((t): t is Date => t !== null);

    const latestPositionUpdate = positionTimestamps.length > 0
      ? new Date(Math.max(...positionTimestamps.map((t) => new Date(t).getTime())))
      : null;

    dataSources.push({
      type: 'position',
      source: 'unifiedPriceService',
      lastUpdate: latestPositionUpdate,
      staleness: this.calculateStaleness(latestPositionUpdate, now),
      isStale: this.calculateStaleness(latestPositionUpdate, now) > 60 * 60 * 1000,
    });

    // Transaction data source
    const transactionTimestamps = transactions.map((t) => t.createdAt).filter(Boolean);
    const latestTransactionUpdate = transactionTimestamps.length > 0
      ? new Date(Math.max(...transactionTimestamps.map((t) => new Date(t).getTime())))
      : null;

    dataSources.push({
      type: 'transaction',
      source: 'database',
      lastUpdate: latestTransactionUpdate,
      staleness: this.calculateStaleness(latestTransactionUpdate, now),
      isStale: this.calculateStaleness(latestTransactionUpdate, now) > 60 * 60 * 1000,
    });

    // Notes data source
    const noteTimestamps = notes.map((n) => n.createdAt);
    const latestNoteUpdate = noteTimestamps.length > 0
      ? new Date(Math.max(...noteTimestamps.map((t) => new Date(t).getTime())))
      : null;

    dataSources.push({
      type: 'note',
      source: 'database',
      lastUpdate: latestNoteUpdate,
      staleness: this.calculateStaleness(latestNoteUpdate, now),
      isStale: this.calculateStaleness(latestNoteUpdate, now) > 60 * 60 * 1000,
    });

    // Market events data source
    const eventTimestamps = marketEvents.map((e) => e.createdAt).filter(Boolean);
    const latestEventUpdate = eventTimestamps.length > 0
      ? new Date(Math.max(...eventTimestamps.map((t) => new Date(t).getTime())))
      : null;

    dataSources.push({
      type: 'search',
      source: 'assetMarketInfo',
      lastUpdate: latestEventUpdate,
      staleness: this.calculateStaleness(latestEventUpdate, now),
      isStale: this.calculateStaleness(latestEventUpdate, now) > 60 * 60 * 1000,
    });

    return this.validateDataFreshness(dataSources);
  }

  /**
   * 生成新的分析报告
   * @param request 生成报告请求
   * @returns 报告ID和状态
   */
  async generateReport(
    request: GenerateReportRequest,
  ): Promise<{ id: string; status: ReportStatus; message?: string }> {
    try {
      logger.info('[ReportService] 开始生成报告', {
        accountId: request.accountId,
        type: request.type,
      });

      // 验证账户是否存在
      const accountExists = await accountRepository.existsById(parseInt(request.accountId));

      if (!accountExists) {
        throw new Error(`账户 ${request.accountId} 不存在`);
      }

      // 确定报告时间范围
      const { startDate, endDate } = this.determineDateRange(
        request.type,
        request.startDate,
        request.endDate,
      );

      // 设置报告标题
      const title = this.generateReportTitle(request.type, startDate, endDate);

      // 创建报告记录（初始状态）
      const reportRecord = await analysisReportRepository.createReport({
        accountId: parseInt(request.accountId),
        type: request.type,
        title,
        content: '报告生成中...',
        startDate,
        endDate,
      });

      // 异步生成报告内容
      this.processReportGeneration(
        reportRecord.id.toString(),
        request.accountId,
        startDate,
        endDate,
        request.modelSlug,
      ).catch(async (error) => {
        logger.error('[ReportService] 报告生成失败', { reportId: reportRecord.id, error });
        // 更新报告状态为失败
        await analysisReportRepository.markFailed(reportRecord.id, `报告生成失败: ${error.message}`);
      });

      logger.info('[ReportService] 报告生成请求已接受', { reportId: reportRecord.id });

      return {
        id: reportRecord.id.toString(),
        status: 'pending',
      };
    } catch (error) {
      logger.error('[ReportService] 生成报告失败', { error });
      throw new Error(`生成报告失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 处理报告生成过程
   * @param reportId 报告ID
   * @param accountId 账户ID
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param modelSlug 可选的模型标识
   */
  private async processReportGeneration(
    reportId: string,
    accountId: string,
    startDate: Date,
    endDate: Date,
    modelSlug?: string,
  ): Promise<void> {
    try {
      // 更新报告状态为处理中
      await analysisReportRepository.updateProgress(parseInt(reportId), 10, '数据收集');

      // 聚合本周数据
      const reportData = await this.aggregateWeeklyData(accountId, startDate, endDate);

      // 更新报告状态为生成AI内容中
      await analysisReportRepository.updateProgress(parseInt(reportId), 50, 'AI分析生成');

      // 生成AI报告内容
      const reportContent = await this.generateAIReportContent(reportData, modelSlug);

      // 更新报告内容和状态（标记为完成）
      await analysisReportRepository.updateContent(
        parseInt(reportId),
        reportContent,
        JSON.stringify(reportData.dataSourceSummary),
      );

      logger.info('[ReportService] 报告生成完成', { reportId });
    } catch (error) {
      logger.error('[ReportService] 报告生成过程失败', { reportId, error });
      throw error;
    }
  }

  /**
   * 聚合本周数据
   * @param accountId 账户ID
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 聚合的数据
   */
  private async aggregateWeeklyData(
    accountId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<WeeklyReportData> {
    try {
      // 获取本周交易记录
      const transactions = await transactionService.getTransactionHistory(accountId, 100, 0);
      const weeklyTransactions = transactions.transactions.filter(
        (t) => t.createdAt && t.createdAt >= startDate && t.createdAt <= endDate,
      );

      // 获取本周市场事件
      const marketEvents = await assetMarketInfoService.getAssetMarketInfosByDateRange(
        startDate,
        endDate,
        50,
      );

      // 获取本周用户笔记
      const userId = await authService.getCurrentUserId();
      const notes = userId
        ? await noteService.getUserNotes(userId, 50, 0, 'createdAt', 'desc')
        : { items: [], totalCount: 0 };
      const weeklyNotes = notes.items.filter(
        (n) => n.createdAt >= startDate && n.createdAt <= endDate,
      );

      // 获取当前持仓
      const currentPositions = await positionService.getCurrentPositions(accountId);

      // 获取核心持仓的投资备忘录，且备忘录不为空
      const investmentMemos: AssetMetaType[] = [];
      for (const position of currentPositions) {
        const assetMetas = await assetMetaService.searchAssetMetasBySymbol(position.symbol);
        const assetMetaNotEmpty = assetMetas.filter(
          (assetMeta) => assetMeta.investmentMemo !== null,
        );
        investmentMemos.push(...assetMetaNotEmpty);
      }

      // 计算本周业绩（使用增强的业绩计算方法）
      const performanceCalculation = await this.calculatePerformance(accountId, startDate, endDate);

      // 转换为 WeeklyPerformance 格式
      const performance: WeeklyPerformance = {
        totalValue: performanceCalculation.endValueCents / 100, // Convert cents to dollars
        previousValue: performanceCalculation.startValueCents / 100,
        changeAmount: performanceCalculation.changeAmountCents / 100,
        changePercentage: performanceCalculation.changePercentage,
        benchmarkPerformance: performanceCalculation.benchmarkReturn ?? undefined,
      };

      // 注入实时行情数据
      const enrichedPositions = await this.enrichWithRealtimeData(currentPositions);

      // 构建数据来源摘要
      const dataSourceSummary = this.buildDataSourceSummary(
        enrichedPositions,
        weeklyTransactions,
        weeklyNotes,
        marketEvents,
      );

      return {
        performance,
        enrichedPositions,
        transactions: weeklyTransactions,
        marketEvents,
        notes: weeklyNotes,
        investmentMemos,
        dataSourceSummary,
      };
    } catch (error) {
      logger.error('[ReportService] 聚合本周数据失败', { error });
      throw new Error(
        `聚合本周数据失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 生成AI报告内容
   * @param reportData 报告数据
   * @param modelSlug 可选的模型标识
   * @returns 生成的报告内容（Markdown格式）
   */
  private async generateAIReportContent(reportData: WeeklyReportData, modelSlug?: string): Promise<string> {
    try {
      // 构建AI提示词
      const prompt = this.buildAIPrompt(reportData);

      recordPrompt(prompt, 'report-generate-prompt.md');

      const llm = await chatModelOpenAI(modelSlug);

      // 创建一个 Agent
      const agent = createAgent({
        model: llm,
        tools: [stockSearchNewsTool, stockRecallCompanyInfoTool, noteQueryTool, TravilySearchTool],
      });
      const messages = [
        new SystemMessage(`
你要扮演一位专业的投资顾问，根据提供的用户持仓数据、市场信息和笔记，生成一份专业的投资周报。
注意：请确保你的回答是基于提供的信息，不要包含任何个人意见，同时要关注信息的时间有效性
`),
        new HumanMessage(prompt),
      ];

      const response = await agent.invoke({
        messages,
      });

      if (response.messages) {
        const lastMessage = response.messages.at(-1);
        return lastMessage?.content as string;
      }

      return '';
    } catch (error) {
      logger.error('[ReportService] 生成AI报告内容失败', { error });
      throw new Error(
        `生成AI报告内容失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 构建AI提示词
   * @param reportData 报告数据
   * @returns AI提示词
   */
  private buildAIPrompt(reportData: WeeklyReportData): string {
    // 构建业绩数据部分
    const performanceSection = this.buildPerformanceSection(reportData.performance);

    // 构建持仓详情部分
    const positionsSection = reportData.enrichedPositions
      ? this.buildPositionsSection(reportData.enrichedPositions)
      : '';

    // 构建数据来源信息
    const dataSourceSection = reportData.dataSourceSummary
      ? this.buildDataSourceSection(reportData.dataSourceSummary)
      : '';

    return `
Task: 生成本周投资周报

## 账户业绩数据
${performanceSection}

## 持仓详情
${positionsSection}

## 其他上下文

### 1. 市场关键信息
${JSON.stringify(reportData.marketEvents, null, 2)}

### 2. 用户笔记
${JSON.stringify(reportData.notes, null, 2)}

### 3. 长期投资逻辑
${JSON.stringify(reportData.investmentMemos, null, 2)}

### 4. 交易记录
${JSON.stringify(reportData.transactions, null, 2)}

${dataSourceSection}

## 输出要求

- 语气专业、客观，数据驱动
- 重点分析：为何涨/跌？（关联市场信息和持仓变化）
- 风险提示：基于本周信息，哪些持仓面临新的风险？
- 格式：Markdown，包含以下章节：
  1. 市场与账户概览（包含本周收益率、与基准对比）
  2. 持仓异动分析（包含各持仓盈亏情况）
  3. 信息与笔记回顾
  4. 下周展望与建议

注意：如果数据时效性分数低于 0.5，请在报告中提示数据可能不是最新的。
`;
  }

  /**
   * 构建业绩数据部分
   */
  private buildPerformanceSection(performance: WeeklyPerformance): string {
    const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
    const formatPercent = (pct: number) => `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;

    return `
| 指标 | 数值 |
|------|------|
| 期初净值 | ${formatCurrency((performance.previousValue || 0) * 100)} |
| 期末净值 | ${formatCurrency((performance.totalValue || 0) * 100)} |
| 收益金额 | ${formatCurrency((performance.changeAmount || 0) * 100)} |
| 收益率 | ${formatPercent(performance.changePercentage || 0)} |
| 基准表现 | ${performance.benchmarkPerformance !== undefined ? formatPercent(performance.benchmarkPerformance) : '数据不可用'} |
| 超额收益 | ${performance.benchmarkPerformance !== undefined ? formatPercent((performance.changePercentage || 0) - performance.benchmarkPerformance) : '数据不可用'} |
`.trim();
  }

  /**
   * 构建持仓详情部分
   */
  private buildPositionsSection(positions: EnrichedPosition[]): string {
    if (positions.length === 0) {
      return '当前无持仓';
    }

    const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;
    const formatStaleness = (ms: number) => {
      if (ms === Infinity) return '未知';
      const mins = Math.floor(ms / 60000);
      if (mins < 60) return `${mins}分钟前`;
      const hours = Math.floor(mins / 60);
      return `${hours}小时前`;
    };

    const header = '| 股票 | 数量 | 成本价 | 现价 | 市值 | 盈亏 | 盈亏% | 更新时间 |';
    const separator = '|------|------|--------|------|------|------|-------|----------|';

    const rows = positions.map(pos => {
      const costPrice = formatCents(pos.averagePriceCents);
      const currentPrice = formatCents(pos.currentPriceCents);
      const marketValue = formatCents(pos.marketValueCents);
      const unrealizedPnL = formatCents(pos.unrealizedGainLossCents);
      const pnlPercent = pos.averagePriceCents > 0
        ? (((pos.currentPriceCents - pos.averagePriceCents) / pos.averagePriceCents) * 100).toFixed(2)
        : '0.00';
      const updateTime = formatStaleness(pos.dataStaleness);
      const isStale = pos.dataStaleness > 60 * 60 * 1000;

      return `| ${pos.symbol} | ${pos.quantity} | ${costPrice} | ${currentPrice} | ${marketValue} | ${unrealizedPnL} | ${pnlPercent}% | ${updateTime}${isStale ? ' ⚠️' : ''} |`;
    });

    return [header, separator, ...rows].join('\n');
  }

  /**
   * 构建数据来源信息部分
   */
  private buildDataSourceSection(summary: DataSourceSummary): string {
    const formatStaleness = (ms: number) => {
      if (ms === Infinity) return '未知';
      const mins = Math.floor(ms / 60000);
      if (mins < 60) return `${mins}分钟`;
      const hours = Math.floor(mins / 60);
      return `${hours}小时`;
    };

    const header = '| 数据类型 | 数据源 | 更新时间 | 陈旧度 | 状态 |';
    const separator = '|----------|--------|----------|--------|------|';

    const rows = summary.sources.map(source => {
      const lastUpdate = source.lastUpdate
        ? new Date(source.lastUpdate).toLocaleString('zh-CN')
        : '未知';
      const staleness = formatStaleness(source.staleness);
      const status = source.isStale ? '⚠️ 陈旧' : '✅ 新鲜';

      return `| ${source.type} | ${source.source} | ${lastUpdate} | ${staleness} | ${status} |`;
    });

    return `
## 数据来源信息

数据时效性分数: ${(summary.freshnessScore * 100).toFixed(0)}%

${header}
${separator}
${rows.join('\n')}
`;
  }

  /**
   * 确定报告时间范围
   * @param type 报告类型
   * @param startDate 开始日期（可选）
   * @param endDate 结束日期（可选）
   * @returns 确定的时间范围
   */
  private determineDateRange(
    type: ReportType,
    startDate?: Date,
    endDate?: Date,
  ): { startDate: Date; endDate: Date } {
    const now = new Date();

    if (startDate && endDate) {
      return { startDate, endDate };
    }

    switch (type) {
      case 'weekly':
        // 默认本周一到周日
        const dayOfWeek = now.getDay(); // 0 (Sunday) to 6 (Saturday)
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 如果是周日，则上周一
        const start = new Date(now);
        start.setDate(now.getDate() - daysToMonday);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        return { startDate: start, endDate: end };

      case 'monthly':
        // 默认本月1号到月末
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);

        return { startDate: monthStart, endDate: monthEnd };

      default:
        // 默认本周
        return this.determineDateRange('weekly', startDate, endDate);
    }
  }

  /**
   * 生成报告标题
   * @param type 报告类型
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 报告标题
   */
  private generateReportTitle(type: ReportType, startDate: Date, endDate: Date): string {
    const startFormatted = startDate.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });
    const endFormatted = endDate.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });

    switch (type) {
      case 'weekly':
        return `投资周报 (${startFormatted}-${endFormatted})`;
      case 'monthly':
        return `投资月报 (${startFormatted}-${endFormatted})`;
      case 'emergency':
        return `紧急风险报告 (${startFormatted})`;
      default:
        return `投资报告 (${startFormatted}-${endFormatted})`;
    }
  }

  /**
   * 获取报告列表
   * @param accountId 账户ID
   * @param type 报告类型（可选）
   * @param limit 限制数量
   * @param offset 偏移量
   * @returns 报告列表和总数
   */
  async getReports(
    accountId: string,
    type?: ReportType,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ items: ReportListItem[]; totalCount: number }> {
    try {
      logger.info('[ReportService] 获取报告列表', { accountId, type, limit, offset });

      // 获取报告列表和总数
      let reportRows: AnalysisReportEntity[];
      let totalCount: number;

      if (type) {
        reportRows = await analysisReportRepository.findByAccountIdAndType(
          parseInt(accountId),
          type,
          limit,
          offset,
        );
        totalCount = await analysisReportRepository.countByAccountIdAndType(parseInt(accountId), type);
      } else {
        reportRows = await analysisReportRepository.findByAccountId(
          parseInt(accountId),
          limit,
          offset,
        );
        totalCount = await analysisReportRepository.countByAccountId(parseInt(accountId));
      }

      const items: ReportListItem[] = reportRows.map((report) => ({
        id: report.id.toString(),
        title: report.title,
        type: report.type as ReportType,
        startDate: report.startDate ? new Date(report.startDate) : null,
        endDate: report.endDate ? new Date(report.endDate) : null,
        createdAt: new Date(report.createdAt),
      }));

      return { items, totalCount: totalCount || 0 };
    } catch (error) {
      logger.error('[ReportService] 获取报告列表失败', { error });
      return { items: [], totalCount: 0 };
    }
  }

  /**
   * 获取报告详情
   * @param reportId 报告ID
   * @param accountId 账户ID
   * @returns 报告详情
   */
  async getReport(reportId: string, accountId: string): Promise<ReportDetail | null> {
    try {
      logger.info('[ReportService] 获取报告详情', { reportId });

      const report = await analysisReportRepository.findByIdAndAccountId(
        parseInt(reportId),
        parseInt(accountId),
      );

      if (!report) {
        return null;
      }

      return {
        id: report.id.toString(),
        accountId: report.accountId.toString(),
        type: report.type as ReportType,
        title: report.title,
        content: report.content,
        startDate: report.startDate ? new Date(report.startDate) : null,
        endDate: report.endDate ? new Date(report.endDate) : null,
        generationProgress: report.generationProgress ?? 0,
        generationStage: report.generationStage,
        dataSourceSummary: report.dataSourceSummary,
        isManuallyEdited: report.isManuallyEdited ?? false,
        lastEditedAt: report.lastEditedAt ? new Date(report.lastEditedAt) : null,
        editCount: report.editCount ?? 0,
        createdAt: new Date(report.createdAt),
        updatedAt: report.updatedAt ? new Date(report.updatedAt) : new Date(report.createdAt),
      };
    } catch (error) {
      logger.error('[ReportService] 获取报告详情失败', { reportId, error });
      return null;
    }
  }

  /**
   * 删除报告
   * @param reportId 报告ID
   * @param accountId 账户ID
   * @returns 是否删除成功
   */
  async deleteReport(reportId: string, accountId: string): Promise<boolean> {
    try {
      logger.info('[ReportService] 删除报告', { reportId, accountId });

      // 验证报告存在且属于指定账户
      const hasOwnership = await analysisReportRepository.verifyOwnership(
        parseInt(reportId),
        parseInt(accountId),
      );

      if (!hasOwnership) {
        return false;
      }

      return await analysisReportRepository.delete(parseInt(reportId));
    } catch (error) {
      logger.error('[ReportService] 删除报告失败', { reportId, error });
      return false;
    }
  }
  /**
   * 更新报告内容公共方法
   * @param reportId 报告ID
   * @param accountId 账户ID（用于权限验证）
   * @param content 报告内容
   * @returns 更新后的报告详情，失败返回 null
   */
  async updateReportContent(
    reportId: string,
    accountId: string,
    content: string,
  ): Promise<ReportDetail | null> {
    try {
      // 验证内容不为空
      if (!content || content.trim().length === 0) {
        logger.error('[ReportService] 更新报告失败：内容不能为空', { reportId });
        return null;
      }

      // 验证报告存在且属于指定账户
      const report = await analysisReportRepository.findByIdAndAccountId(
        parseInt(reportId),
        parseInt(accountId),
      );

      if (!report) {
        logger.error('[ReportService] 更新报告失败：报告不存在或无权限', { reportId, accountId });
        return null;
      }

      // 更新报告内容
      const updatedReport = await analysisReportRepository.update(parseInt(reportId), { content });

      if (!updatedReport) {
        return null;
      }

      logger.info('[ReportService] 更新报告成功', { reportId, accountId });

      return {
        id: updatedReport.id.toString(),
        accountId: updatedReport.accountId.toString(),
        type: updatedReport.type as ReportType,
        title: updatedReport.title,
        content: updatedReport.content,
        startDate: updatedReport.startDate ? new Date(updatedReport.startDate) : null,
        endDate: updatedReport.endDate ? new Date(updatedReport.endDate) : null,
        generationProgress: updatedReport.generationProgress ?? 0,
        generationStage: updatedReport.generationStage,
        dataSourceSummary: updatedReport.dataSourceSummary,
        isManuallyEdited: updatedReport.isManuallyEdited ?? false,
        lastEditedAt: updatedReport.lastEditedAt ? new Date(updatedReport.lastEditedAt) : null,
        editCount: updatedReport.editCount ?? 0,
        createdAt: new Date(updatedReport.createdAt),
        updatedAt: updatedReport.updatedAt ? new Date(updatedReport.updatedAt) : new Date(updatedReport.createdAt),
      };
    } catch (error) {
      logger.error('[ReportService] 更新报告失败', { reportId, accountId, error });
      return null;
    }
  }
}

const reportService = new ReportService();

export default reportService;
