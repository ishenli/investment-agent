/**
 * Default model pricing table (USD per 1M tokens).
 *
 * Injected into HermesAgent observability config at engine initialization.
 * The main project is responsible for maintaining and updating this table.
 */
import type { ModelPricingTable } from '@investment-agent/hermes-agent';

export const defaultModelPricing: ModelPricingTable = {
  'gpt-4o': { inputPerMillion: 2.5, outputPerMillion: 10 },
  'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  'gpt-4-turbo': { inputPerMillion: 10, outputPerMillion: 30 },
  'claude-3-5-sonnet': { inputPerMillion: 3, outputPerMillion: 15 },
  'claude-3-5-haiku': { inputPerMillion: 0.8, outputPerMillion: 4 },
  'claude-3-opus': { inputPerMillion: 15, outputPerMillion: 75 },
  'gemini-1.5-pro': { inputPerMillion: 3.5, outputPerMillion: 10.5 },
  'gemini-1.5-flash': { inputPerMillion: 0.35, outputPerMillion: 1.05 },
  'deepseek-chat': { inputPerMillion: 0.14, outputPerMillion: 0.28 },
  'deepseek-reasoner': { inputPerMillion: 0.55, outputPerMillion: 2.19 },
};

/** Get pricing for a specific model slug (provider/model format) */
export function getModelPricing(modelSlug: string): ModelPricingTable[string] | undefined {
  // Try exact match first
  if (defaultModelPricing[modelSlug]) {
    return defaultModelPricing[modelSlug];
  }
  // Try base name match (e.g. 'gpt-4o-2024-08-06' → 'gpt-4o')
  for (const key of Object.keys(defaultModelPricing)) {
    if (modelSlug.startsWith(key)) {
      return defaultModelPricing[key];
    }
  }
  return undefined;
}
