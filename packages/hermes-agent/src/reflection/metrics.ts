/**
 * ReflectionMetrics — token/latency tracking for the reflection pipeline.
 */

export interface ReflectionMetricsSnapshot {
  /** Reflection phase duration in milliseconds */
  durationMs: number;
  /** Number of dimensions checked */
  dimensionsChecked: number;
  /** Number of dimensions found missing */
  dimensionsMissing: number;
  /** Number of skills created */
  skillsCreated: number;
  /** Input tokens consumed by the audit LLM call (estimated) */
  tokensInput: number;
  /** Output tokens consumed by the audit LLM call (estimated) */
  tokensOutput: number;
}

/**
 * Simple metrics collector for a single reflection run.
 */
export class ReflectionMetricsCollector {
  private startTime: number;
  private endTime?: number;
  dimensionsChecked = 0;
  dimensionsMissing = 0;
  skillsCreated = 0;
  tokensInput = 0;
  tokensOutput = 0;

  constructor() {
    this.startTime = Date.now();
  }

  setDimensions(checked: number, missing: number): void {
    this.dimensionsChecked = checked;
    this.dimensionsMissing = missing;
  }

  setSkillsCreated(count: number): void {
    this.skillsCreated = count;
  }

  setTokens(input: number, output: number): void {
    this.tokensInput = input;
    this.tokensOutput = output;
  }

  stop(): void {
    this.endTime = Date.now();
  }

  snapshot(): ReflectionMetricsSnapshot {
    return {
      durationMs: (this.endTime ?? Date.now()) - this.startTime,
      dimensionsChecked: this.dimensionsChecked,
      dimensionsMissing: this.dimensionsMissing,
      skillsCreated: this.skillsCreated,
      tokensInput: this.tokensInput,
      tokensOutput: this.tokensOutput,
    };
  }
}

/**
 * Estimate token count from character count.
 * Uses a rough heuristic: ~4 chars per token.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
