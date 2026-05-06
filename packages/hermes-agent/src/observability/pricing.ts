/**
 * Pricing utilities for cost tracking.
 *
 * Cost is calculated from token usage and an externally provided pricing table.
 * No hard-coded prices — the consumer (main project) injects the table.
 */

import type { ModelPricingTable, ModelPricing, CostBreakdown } from './types';

/**
 * Calculate cost from token usage and a pricing table.
 *
 * @param modelName — canonical model name from the provider
 * @param usage — token counts
 * @param pricingTable — USD-per-1M-tokens table (injected by consumer)
 * @param defaultPricing — fallback when model is not in the table
 * @returns cost breakdown in USD
 */
export function calculateCost(
  modelName: string,
  usage: {
    input?: number;
    output?: number;
    cached?: number;
    reasoning?: number;
  },
  pricingTable: ModelPricingTable,
  defaultPricing?: ModelPricing,
): CostBreakdown {
  const pricing = pricingTable[modelName] ?? defaultPricing ?? {
    inputPerMillion: 0,
    outputPerMillion: 0,
  };

  const inputCost = ((usage.input ?? 0) / 1_000_000) * pricing.inputPerMillion;
  const outputCost = ((usage.output ?? 0) / 1_000_000) * pricing.outputPerMillion;
  const cachedCost = ((usage.cached ?? 0) / 1_000_000) * (pricing.cachedInputPerMillion ?? pricing.inputPerMillion);
  const reasoningCost = ((usage.reasoning ?? 0) / 1_000_000) * (pricing.reasoningPerMillion ?? pricing.outputPerMillion);

  return {
    inputCost,
    outputCost,
    cachedCost,
    reasoningCost,
    totalCost: inputCost + outputCost + cachedCost + reasoningCost,
  };
}
