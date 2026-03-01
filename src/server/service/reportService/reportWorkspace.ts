/**
 * Report Workspace Manager
 *
 * Manages temporary workspace directories for Claude Agent SDK based report generation.
 * Creates structured data files that the agent can read to generate reports.
 */
import fs from 'fs/promises';
import path from 'path';
import { getProjectRoot } from '@server/base/env';
import logger from '@server/base/logger';
import type { WeeklyReportData, WeeklyPerformance } from '@/server/service/reportService';
import type { EnrichedPosition, DataSourceSummary } from '@/types/report';

/**
 * Workspace file structure for report generation
 */
export interface ReportWorkspaceFiles {
  contextMd: string;
  positionsJson: string;
  transactionsJson: string;
  notesJson: string;
  marketEventsJson: string;
}

/**
 * ReportWorkspaceManager
 *
 * Handles creation, management, and cleanup of temporary workspace directories
 * for AI report generation using Claude Agent SDK.
 */
export class ReportWorkspaceManager {
  private workspaceRoot: string;

  constructor() {
    const projectRoot = getProjectRoot();
    this.workspaceRoot = path.join(projectRoot, 'run/temp', 'report-generation');
  }

  /**
   * Create a new workspace for report generation
   *
   * @param reportId - Unique identifier for the report
   * @param reportData - Aggregated report data to write to workspace
   * @returns Path to the created workspace directory
   */
  async createWorkspace(reportId: string, reportData: WeeklyReportData): Promise<string> {
    const workDir = path.join(this.workspaceRoot, reportId);

    try {
      // Create workspace directory
      await fs.mkdir(workDir, { recursive: true });
      logger.info(`[ReportWorkspaceManager] Created workspace directory: ${workDir}`);

      // Write all data files
      await Promise.all([
        this.writeContextFile(workDir, reportData),
        this.writePositionsFile(workDir, reportData.enrichedPositions),
        this.writeTransactionsFile(workDir, reportData.transactions),
        this.writeNotesFile(workDir, reportData.notes),
        this.writeMarketEventsFile(workDir, reportData.marketEvents),
      ]);

      logger.info(`[ReportWorkspaceManager] Workspace files created for report ${reportId}`);
      return workDir;
    } catch (error) {
      logger.error(`[ReportWorkspaceManager] Failed to create workspace: ${error}`);
      // Attempt cleanup on failure
      await this.cleanup(reportId);
      throw error;
    }
  }

  /**
   * Clean up workspace directory after report generation
   *
   * @param reportId - Unique identifier for the report
   */
  async cleanup(reportId: string): Promise<void> {
    const workDir = path.join(this.workspaceRoot, reportId);

    try {
      await fs.rm(workDir, { recursive: true, force: true });
      logger.info(`[ReportWorkspaceManager] Cleaned up workspace: ${workDir}`);
    } catch (error) {
      // Log warning but don't throw - cleanup failure shouldn't break report generation
      logger.warn(`[ReportWorkspaceManager] Failed to cleanup workspace ${workDir}: ${error}`);
    }
  }

  /**
   * Get the workspace root directory path
   */
  getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }

  // ============== Private Methods ==============

  /**
   * Write context.md file with performance and position summaries
   */
  private async writeContextFile(workDir: string, reportData: WeeklyReportData): Promise<void> {
    const content = this.buildContextFile(reportData);
    await fs.writeFile(path.join(workDir, 'context.md'), content, 'utf-8');
  }

  /**
   * Write positions.json file
   */
  private async writePositionsFile(
    workDir: string,
    positions?: EnrichedPosition[],
  ): Promise<void> {
    const content = JSON.stringify(positions ?? [], null, 2);
    await fs.writeFile(path.join(workDir, 'positions.json'), content, 'utf-8');
  }

  /**
   * Write transactions.json file
   */
  private async writeTransactionsFile(workDir: string, transactions: unknown[]): Promise<void> {
    const content = JSON.stringify(transactions, null, 2);
    await fs.writeFile(path.join(workDir, 'transactions.json'), content, 'utf-8');
  }

  /**
   * Write notes.json file
   */
  private async writeNotesFile(workDir: string, notes: unknown[]): Promise<void> {
    const content = JSON.stringify(notes, null, 2);
    await fs.writeFile(path.join(workDir, 'notes.json'), content, 'utf-8');
  }

  /**
   * Write market-events.json file
   */
  private async writeMarketEventsFile(workDir: string, events: unknown[]): Promise<void> {
    const content = JSON.stringify(events, null, 2);
    await fs.writeFile(path.join(workDir, 'market-events.json'), content, 'utf-8');
  }

  /**
   * Build context.md content
   */
  private buildContextFile(reportData: WeeklyReportData): string {
    const performanceSection = this.buildPerformanceSection(reportData.performance);
    const positionsSection = reportData.enrichedPositions
      ? this.buildPositionsSection(reportData.enrichedPositions)
      : '*当前无持仓*';
    const dataSourceSection = reportData.dataSourceSummary
      ? this.buildDataSourceSection(reportData.dataSourceSummary)
      : '';

    return `# 报告生成上下文

本文档包含账户业绩概览和持仓摘要，用于 AI 生成投资周报。

## 数据文件说明

- \`context.md\` (本文件): 账户业绩和持仓摘要
- \`positions.json\`: 持仓明细（结构化 JSON 数据，含实时行情）
- \`transactions.json\`: 本周交易记录
- \`notes.json\`: 用户投资笔记
- \`market-events.json\`: 本周市场关键事件

## 账户业绩

${performanceSection}

## 持仓详情

${positionsSection}

${dataSourceSection}

## 输出要求

请基于以上数据生成投资周报，格式为 Markdown，包含以下章节：

1. **市场与账户概览**：本周收益率、与基准对比
2. **持仓异动分析**：各持仓盈亏情况、风险变化
3. **信息与笔记回顾**：关键市场事件和用户笔记摘要
4. **下周展望与建议**：投资策略建议

语气专业、客观，数据驱动。如果数据时效性分数低于 0.5，请在报告中提示。
`.trim();
  }

  /**
   * Build performance section in Markdown format
   */
  private buildPerformanceSection(performance: WeeklyPerformance): string {
    const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
    const formatPercent = (pct: number) => `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;

    return `| 指标 | 数值 |
|------|------|
| 期初净值 | ${formatCurrency(performance.previousValue || 0)} |
| 期末净值 | ${formatCurrency(performance.totalValue || 0)} |
| 收益金额 | ${formatCurrency(performance.changeAmount || 0)} |
| 收益率 | ${formatPercent(performance.changePercentage || 0)} |
| 基准表现 | ${performance.benchmarkPerformance !== undefined ? formatPercent(performance.benchmarkPerformance) : '数据不可用'} |
| 超额收益 | ${performance.benchmarkPerformance !== undefined ? formatPercent((performance.changePercentage || 0) - performance.benchmarkPerformance) : '数据不可用'} |`;
  }

  /**
   * Build positions section in Markdown format
   */
  private buildPositionsSection(positions: EnrichedPosition[]): string {
    if (positions.length === 0) {
      return '*当前无持仓*';
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

    const rows = positions.map((pos) => {
      const costPrice = formatCents(pos.averagePriceCents);
      const currentPrice = formatCents(pos.currentPriceCents);
      const marketValue = formatCents(pos.marketValueCents);
      const unrealizedPnL = formatCents(pos.unrealizedGainLossCents);
      const pnlPercent =
        pos.averagePriceCents > 0
          ? (((pos.currentPriceCents - pos.averagePriceCents) / pos.averagePriceCents) * 100).toFixed(2)
          : '0.00';
      const updateTime = formatStaleness(pos.dataStaleness);
      const isStale = pos.dataStaleness > 60 * 60 * 1000;

      return `| ${pos.symbol} | ${pos.quantity} | ${costPrice} | ${currentPrice} | ${marketValue} | ${unrealizedPnL} | ${pnlPercent}% | ${updateTime}${isStale ? ' ⚠️' : ''} |`;
    });

    return [header, separator, ...rows].join('\n');
  }

  /**
   * Build data source section in Markdown format
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

    const rows = summary.sources.map((source) => {
      const lastUpdate = source.lastUpdate
        ? new Date(source.lastUpdate).toLocaleString('zh-CN')
        : '未知';
      const staleness = formatStaleness(source.staleness);
      const status = source.isStale ? '⚠️ 陈旧' : '✅ 新鲜';

      return `| ${source.type} | ${source.source} | ${lastUpdate} | ${staleness} | ${status} |`;
    });

    return `## 数据来源信息

数据时效性分数: ${(summary.freshnessScore * 100).toFixed(0)}%

${header}
${separator}
${rows.join('\n')}`;
  }
}

// Export singleton instance
export const reportWorkspaceManager = new ReportWorkspaceManager();