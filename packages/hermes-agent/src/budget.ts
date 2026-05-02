/**
 * Iteration budget for agent execution.
 *
 * Ported from Python hermes-agent's IterationBudget class.
 * Tracks consumed/remaining iterations to prevent runaway loops.
 */

export class IterationBudget {
  readonly maxTotal: number;
  private _used: number = 0;

  constructor(maxTotal: number) {
    this.maxTotal = maxTotal;
  }

  /** Try to consume one iteration. Returns true if allowed. */
  consume(): boolean {
    if (this._used >= this.maxTotal) return false;
    this._used++;
    return true;
  }

  /** Give back one iteration (e.g. for housekeeping-only turns). */
  refund(): void {
    if (this._used > 0) this._used--;
  }

  /** Reset the budget for a new turn. */
  reset(): void {
    this._used = 0;
  }

  get used(): number {
    return this._used;
  }

  get remaining(): number {
    return Math.max(0, this.maxTotal - this._used);
  }

  get exhausted(): boolean {
    return this._used >= this.maxTotal;
  }
}
