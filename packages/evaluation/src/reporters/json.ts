import type { EvaluationReport } from '../core/types';

export function toJsonReport(report: EvaluationReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

