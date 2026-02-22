import { db } from '@server/lib/db';
import { portfolioSnapshots, assetPositions, accountFunds } from '@/drizzle/schema';
import { eq, and, lte, gte, desc, sql } from 'drizzle-orm';
import logger from '@server/base/logger';
import priceService from './priceService';

/**
 * Position snapshot for storing in the positions JSON field
 */
export interface PositionSnapshot {
  symbol: string;
  quantity: number;
  averagePriceCents: number;
  currentPriceCents: number;
  marketValueCents: number;
  unrealizedGainLossCents: number;
  sector?: string;
}

/**
 * Positions JSON structure for snapshot storage
 */
export interface SnapshotPositions {
  positions: PositionSnapshot[];
  totalPositionsValueCents: number;
  positionCount: number;
}

/**
 * Snapshot source type
 */
export type SnapshotSource = 'scheduled' | 'manual' | 'backfill';

/**
 * Portfolio snapshot record type
 */
export interface PortfolioSnapshotRecord {
  id: number;
  accountId: number;
  snapshotDate: Date;
  totalValueCents: number;
  cashBalanceCents: number;
  positions: SnapshotPositions;
  benchmarkValueCents: number | null;
  benchmarkSymbol: string;
  source: SnapshotSource;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service for managing portfolio snapshots
 * Used for historical performance calculation
 */
export class PortfolioSnapshotService {
  /**
   * Create a snapshot for a specific account and date
   * If a snapshot already exists for that date, it will be updated (idempotent)
   * @param accountId Account ID
   * @param date Snapshot date (defaults to today)
   * @param source Source of the snapshot creation
   * @returns Created or updated snapshot record
   */
  async createSnapshot(
    accountId: number,
    date: Date = new Date(),
    source: SnapshotSource = 'scheduled',
  ): Promise<PortfolioSnapshotRecord> {
    try {
      // Normalize date to start of day (remove time component)
      const snapshotDate = this.normalizeToDate(date);

      // Get all positions for the account
      const positions = await db.query.assetPositions.findMany({
        where: eq(assetPositions.accountId, accountId),
      });

      // Get cash balance
      const accountFund = await db.query.accountFunds.findFirst({
        where: eq(accountFunds.accountId, accountId),
      });
      const cashBalanceCents = accountFund?.amountCents ?? 0;

      // Build positions snapshot with current prices
      const positionSnapshots: PositionSnapshot[] = [];
      let totalPositionsValueCents = 0;

      for (const position of positions) {
        // Get current price for the symbol
        const currentPrice = await this.getCurrentPrice(position.symbol);
        const currentPriceCents = Math.round(currentPrice * 100);

        const quantity = position.quantity;
        const marketValueCents = Math.round(currentPriceCents * quantity);
        const unrealizedGainLossCents = marketValueCents - (position.averagePriceCents * quantity);

        positionSnapshots.push({
          symbol: position.symbol,
          quantity,
          averagePriceCents: position.averagePriceCents,
          currentPriceCents,
          marketValueCents,
          unrealizedGainLossCents,
          sector: position.sector ?? undefined,
        });

        totalPositionsValueCents += marketValueCents;
      }

      const positionsData: SnapshotPositions = {
        positions: positionSnapshots,
        totalPositionsValueCents,
        positionCount: positionSnapshots.length,
      };

      // Calculate total value (positions + cash)
      const totalValueCents = totalPositionsValueCents + cashBalanceCents;

      // Get benchmark value (SPY)
      const benchmarkValueCents = await this.getBenchmarkValue('SPY');

      // Check if snapshot already exists for this date
      const existingSnapshot = await db.query.portfolioSnapshots.findFirst({
        where: and(
          eq(portfolioSnapshots.accountId, accountId),
          eq(portfolioSnapshots.snapshotDate, snapshotDate),
        ),
      });

      if (existingSnapshot) {
        // Update existing snapshot (idempotent)
        const [updatedSnapshot] = await db
          .update(portfolioSnapshots)
          .set({
            totalValueCents,
            cashBalanceCents,
            positions: positionsData,
            benchmarkValueCents,
            source,
            updatedAt: new Date(),
          })
          .where(eq(portfolioSnapshots.id, existingSnapshot.id))
          .returning();

        logger.info(
          `Updated snapshot for account ${accountId} on ${snapshotDate.toISOString().split('T')[0]}`,
        );

        return this.toRecord(updatedSnapshot);
      }

      // Create new snapshot
      const [newSnapshot] = await db
        .insert(portfolioSnapshots)
        .values({
          accountId,
          snapshotDate,
          totalValueCents,
          cashBalanceCents,
          positions: positionsData,
          benchmarkValueCents,
          benchmarkSymbol: 'SPY',
          source,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      logger.info(
        `Created snapshot for account ${accountId} on ${snapshotDate.toISOString().split('T')[0]}`,
      );

      return this.toRecord(newSnapshot);
    } catch (error) {
      logger.error(`Failed to create snapshot for account ${accountId}: ${error}`);
      throw new Error(`Failed to create snapshot: ${error}`);
    }
  }

  /**
   * Get the nearest snapshot on or before the target date
   * @param accountId Account ID
   * @param targetDate Target date
   * @returns Nearest snapshot or null if not found
   */
  async getNearestSnapshot(
    accountId: number,
    targetDate: Date,
  ): Promise<PortfolioSnapshotRecord | null> {
    try {
      const normalizedDate = this.normalizeToDate(targetDate);

      // First try to get exact date match
      const exactSnapshot = await db.query.portfolioSnapshots.findFirst({
        where: and(
          eq(portfolioSnapshots.accountId, accountId),
          eq(portfolioSnapshots.snapshotDate, normalizedDate),
        ),
      });

      if (exactSnapshot) {
        return this.toRecord(exactSnapshot);
      }

      // If not found, get the nearest snapshot before the target date
      const nearestSnapshot = await db.query.portfolioSnapshots.findFirst({
        where: and(
          eq(portfolioSnapshots.accountId, accountId),
          lte(portfolioSnapshots.snapshotDate, normalizedDate),
        ),
        orderBy: [desc(portfolioSnapshots.snapshotDate)],
      });

      if (nearestSnapshot) {
        logger.info(
          `Using nearest snapshot for account ${accountId}: requested ${normalizedDate.toISOString().split('T')[0]}, using ${nearestSnapshot.snapshotDate.toISOString().split('T')[0]}`,
        );
        return this.toRecord(nearestSnapshot);
      }

      return null;
    } catch (error) {
      logger.error(`Failed to get nearest snapshot for account ${accountId}: ${error}`);
      return null;
    }
  }

  /**
   * Get all snapshots within a date range
   * @param accountId Account ID
   * @param startDate Start date (inclusive)
   * @param endDate End date (inclusive)
   * @returns Array of snapshots
   */
  async getSnapshotsByDateRange(
    accountId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<PortfolioSnapshotRecord[]> {
    try {
      const normalizedStartDate = this.normalizeToDate(startDate);
      const normalizedEndDate = this.normalizeToDate(endDate);

      const snapshots = await db.query.portfolioSnapshots.findMany({
        where: and(
          eq(portfolioSnapshots.accountId, accountId),
          gte(portfolioSnapshots.snapshotDate, normalizedStartDate),
          lte(portfolioSnapshots.snapshotDate, normalizedEndDate),
        ),
        orderBy: [portfolioSnapshots.snapshotDate],
      });

      return snapshots.map((s) => this.toRecord(s));
    } catch (error) {
      logger.error(`Failed to get snapshots for account ${accountId}: ${error}`);
      return [];
    }
  }

  /**
   * Get all snapshots for an account
   * @param accountId Account ID
   * @returns Array of all snapshots for the account
   */
  async getAllSnapshots(accountId: number): Promise<PortfolioSnapshotRecord[]> {
    try {
      const snapshots = await db.query.portfolioSnapshots.findMany({
        where: eq(portfolioSnapshots.accountId, accountId),
        orderBy: [desc(portfolioSnapshots.snapshotDate)],
      });

      return snapshots.map((s) => this.toRecord(s));
    } catch (error) {
      logger.error(`Failed to get all snapshots for account ${accountId}: ${error}`);
      return [];
    }
  }

  /**
   * Delete a snapshot by ID
   * @param snapshotId Snapshot ID
   * @returns True if deleted, false otherwise
   */
  async deleteSnapshot(snapshotId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(portfolioSnapshots)
        .where(eq(portfolioSnapshots.id, snapshotId))
        .returning();

      return result.length > 0;
    } catch (error) {
      logger.error(`Failed to delete snapshot ${snapshotId}: ${error}`);
      return false;
    }
  }

  /**
   * Get the most recent snapshot for an account
   * @param accountId Account ID
   * @returns Most recent snapshot or null
   */
  async getLatestSnapshot(accountId: number): Promise<PortfolioSnapshotRecord | null> {
    try {
      const snapshot = await db.query.portfolioSnapshots.findFirst({
        where: eq(portfolioSnapshots.accountId, accountId),
        orderBy: [desc(portfolioSnapshots.snapshotDate)],
      });

      return snapshot ? this.toRecord(snapshot) : null;
    } catch (error) {
      logger.error(`Failed to get latest snapshot for account ${accountId}: ${error}`);
      return null;
    }
  }

  /**
   * Check if a snapshot exists for a specific date
   * @param accountId Account ID
   * @param date Date to check
   * @returns True if snapshot exists
   */
  async hasSnapshotForDate(accountId: number, date: Date): Promise<boolean> {
    try {
      const normalizedDate = this.normalizeToDate(date);
      const snapshot = await db.query.portfolioSnapshots.findFirst({
        where: and(
          eq(portfolioSnapshots.accountId, accountId),
          eq(portfolioSnapshots.snapshotDate, normalizedDate),
        ),
      });

      return !!snapshot;
    } catch (error) {
      logger.error(`Failed to check snapshot existence: ${error}`);
      return false;
    }
  }

  /**
   * Normalize a date to the start of the day (midnight UTC)
   * @param date Date to normalize
   * @returns Normalized date
   */
  private normalizeToDate(date: Date): Date {
    const normalized = new Date(date);
    normalized.setUTCHours(0, 0, 0, 0);
    return normalized;
  }

  /**
   * Get current price for a symbol
   * @param symbol Stock symbol
   * @returns Current price (in dollars, not cents)
   */
  private async getCurrentPrice(symbol: string): Promise<number> {
    try {
      const priceInfo = await priceService.getLatestPrice(symbol);
      return priceInfo?.price ?? 0;
    } catch (error) {
      logger.warn(`Failed to get current price for ${symbol}: ${error}`);
      return 0;
    }
  }

  /**
   * Get benchmark value (price of SPY or other benchmark)
   * @param symbol Benchmark symbol (default: SPY)
   * @returns Benchmark value in cents
   */
  private async getBenchmarkValue(symbol: string = 'SPY'): Promise<number> {
    try {
      const priceInfo = await priceService.getLatestPrice(symbol);
      const price = priceInfo?.price ?? 0;
      return Math.round(price * 100); // Convert to cents
    } catch (error) {
      logger.warn(`Failed to get benchmark value for ${symbol}: ${error}`);
      return 0;
    }
  }

  /**
   * Convert database record to typed record
   * @param dbRecord Database record
   * @returns Typed record
   */
  private toRecord(dbRecord: any): PortfolioSnapshotRecord {
    return {
      id: dbRecord.id,
      accountId: dbRecord.accountId,
      snapshotDate: dbRecord.snapshotDate,
      totalValueCents: dbRecord.totalValueCents,
      cashBalanceCents: dbRecord.cashBalanceCents,
      positions: dbRecord.positions as SnapshotPositions,
      benchmarkValueCents: dbRecord.benchmarkValueCents,
      benchmarkSymbol: dbRecord.benchmarkSymbol ?? 'SPY',
      source: dbRecord.source as SnapshotSource,
      notes: dbRecord.notes,
      createdAt: dbRecord.createdAt,
      updatedAt: dbRecord.updatedAt,
    };
  }
}

const portfolioSnapshotService = new PortfolioSnapshotService();

export default portfolioSnapshotService;