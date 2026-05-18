/**
 * Persistence adapter interface - allows decoupling evaluation package
 * from any specific storage implementation.
 */
import type { EvaluationReport } from './types';

/**
 * Persistence adapter interface for saving evaluation results.
 * Implement this interface to integrate with your storage backend.
 */
export interface PersistenceAdapter {
  /**
   * Save evaluation report to persistent storage.
   * @param report - The evaluation report to persist
   * @returns true if successfully persisted, false otherwise
   */
  saveReport(report: EvaluationReport): Promise<boolean>;
}

/**
 * No-op persistence adapter that silently discards all reports.
 * Useful for CLI usage where persistence is not required.
 */
export class NoOpPersistenceAdapter implements PersistenceAdapter {
  async saveReport(): Promise<boolean> {
    return false;
  }
}

/**
 * Composite persistence adapter that tries multiple adapters.
 * Reports success if any adapter succeeds.
 */
export class CompositePersistenceAdapter implements PersistenceAdapter {
  constructor(private readonly adapters: PersistenceAdapter[]) {}

  async saveReport(report: EvaluationReport): Promise<boolean> {
    const results = await Promise.all(
      this.adapters.map((adapter) => adapter.saveReport(report)),
    );
    return results.some((result) => result);
  }
}
