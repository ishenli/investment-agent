import type { EvaluationReport } from '../core/types';

export function toMarkdownReport(report: EvaluationReport): string {
  const lines: string[] = [
    `# Agent Evaluation Report`,
    '',
    `- Run ID: \`${report.runId}\``,
    `- Generated: ${report.generatedAt}`,
    `- Engine: \`${report.config.engine}\``,
    `- Threshold: ${report.config.threshold}`,
    '',
    '## Summary',
    '',
    `| Total | Passed | Failed | Score |`,
    `|---:|---:|---:|---:|`,
    `| ${report.summary.total} | ${report.summary.passed} | ${report.summary.failed} | ${report.summary.score.toFixed(3)} |`,
    '',
    '## Dimensions',
    '',
    '| Dimension | Score |',
    '|---|---:|',
    ...Object.entries(report.summary.byDimension).map(([dimension, score]) => `| ${dimension} | ${score.toFixed(3)} |`),
    '',
    '## Categories',
    '',
    '| Category | Total | Passed | Failed | Score |',
    '|---|---:|---:|---:|---:|',
    ...Object.entries(report.summary.byCategory).map(
      ([category, bucket]) =>
        `| ${category} | ${bucket.total} | ${bucket.passed} | ${bucket.failed} | ${bucket.score.toFixed(3)} |`,
    ),
    '',
    '## Failed Cases',
    '',
  ];

  const failed = report.results.filter((result) => !result.passed);
  if (failed.length === 0) {
    lines.push('No failed cases.');
  } else {
    for (const result of failed) {
      lines.push(`- \`${result.case.id}\` ${result.case.title}: ${result.score.toFixed(3)}`);
    }
  }

  if (report.suggestions && report.suggestions.length > 0) {
    lines.push('');
    lines.push('## Improvement Suggestions');
    lines.push('');
    lines.push('| Priority | Dimension | Category | Title | Affected | Source |');
    lines.push('|---|---|---|---|---:|---|');
    for (const s of report.suggestions) {
      lines.push(`| ${s.priority} | ${s.dimension} | ${s.category} | ${s.title} | ${s.affectedCases.length} | ${s.source} |`);
    }

    lines.push('');
    for (const s of report.suggestions) {
      lines.push(`### ${s.title}`);
      lines.push('');
      lines.push(s.description);
      lines.push('');
      lines.push(`- **Priority:** ${s.priority} | **Effort:** ${s.effort} | **Source:** ${s.source}`);
      lines.push(`- **Affected cases:** ${s.affectedCases.join(', ')}`);
      lines.push('');
    }
  }

  lines.push('');
  return `${lines.join('\n')}\n`;
}

