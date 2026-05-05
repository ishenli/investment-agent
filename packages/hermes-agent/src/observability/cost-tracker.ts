/**
 * CostTracker — calculates and accumulates API costs per trace.
 *
 * Uses an externally injected ModelPricingTable (no hard-coded prices).
 * Unknown models silently fall back to zero cost or a user-defined default.
 */

import type {
  ModelPricingTable,
  ModelPricing,
  CostBreakdown,
  TraceContext,
} from './types';
import { calculateCost } from './pricing';

export class CostTracker {
  private perModelCosts = new Map<string, CostBreakdown>();

  constructor(
    private pricingTable: ModelPricingTable,
    private defaultPricing?: ModelPricing,
  ) {}

  /**
   * Record cost for a single LLM call.
   *
   * @param traceCtx — trace context
   * @param modelName — model name from the provider
   * @param usage — token usage from the response
   * @returns the cost breakdown for this call
   */
  recordCall(
    traceCtx: TraceContext,
    modelName: string,
    usage: {
      input?: number;
      output?: number;
      cached?: number;
      reasoning?: number;
    },
  ): CostBreakdown {
    const breakdown = calculateCost(
      modelName,
      usage,
      this.pricingTable,
      this.defaultPricing,
    );

    const existing = this.perModelCosts.get(modelName);
    if (existing) {
      this.perModelCosts.set(modelName, {
        inputCost: existing.inputCost + breakdown.inputCost,
        outputCost: existing.outputCost + breakdown.outputCost,
        cachedCost: existing.cachedCost + breakdown.cachedCost,
        reasoningCost: existing.reasoningCost + breakdown.reasoningCost,
        totalCost: existing.totalCost + breakdown.totalCost,
      });
    } else {
      this.perModelCosts.set(modelName, breakdown);
    }

    return breakdown;
  }

  /** Aggregate cost across all models in this trace */
  totalCost(): CostBreakdown {
    let inputCost = 0;
    let outputCost = 0;
    let cachedCost = 0;
    let reasoningCost = 0;
    let totalCost = 0;

    for (const c of this.perModelCosts.values()) {
      inputCost += c.inputCost;
      outputCost += c.outputCost;
      cachedCost += c.cachedCost;
      reasoningCost += c.reasoningCost;
      totalCost += c.totalCost;
    }

    return {
      inputCost,
      outputCost,
      cachedCost,
      reasoningCost,
      totalCost,
    };
  }
}
