import type { EvaluationReport } from '../core/types';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function toHtmlReport(report: EvaluationReport): string {
  const { summary, results, runId, generatedAt, config } = report;

  const dimensionRows = Object.entries(summary.byDimension)
    .map(([dim, score]) => `<tr><td>${dim}</td><td>${score.toFixed(3)}</td></tr>`)
    .join('\n');

  const categoryRows = Object.entries(summary.byCategory)
    .map(([cat, b]) => `<tr><td>${cat}</td><td>${b.total}</td><td>${b.passed}</td><td>${b.failed}</td><td>${b.score.toFixed(3)}</td></tr>`)
    .join('\n');

  const caseRows = results
    .map((r) => {
      const status = r.passed ? 'PASS' : 'FAIL';
      const cls = r.passed ? 'pass' : 'fail';
      return `<tr class="${cls}"><td>${r.case.id}</td><td>${escapeHtml(r.case.title)}</td><td>${r.case.category}</td><td>${status}</td><td>${r.score.toFixed(3)}</td></tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Evaluation Report - ${runId}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 2rem; background: #f5f5f5; }
  .container { max-width: 1200px; margin: 0 auto; background: #fff; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  h1 { margin-top: 0; }
  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin: 1.5rem 0; }
  .card { background: #f8f9fa; padding: 1rem; border-radius: 6px; text-align: center; }
  .card .label { font-size: 0.85rem; color: #666; margin-bottom: 0.5rem; }
  .card .value { font-size: 1.5rem; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  th, td { padding: 0.6rem 0.8rem; text-align: left; border-bottom: 1px solid #e0e0e0; }
  th { background: #f0f0f0; font-weight: 600; }
  tr.pass td { color: #2e7d32; }
  tr.fail td { color: #c62828; font-weight: 600; }
  .scorer-tag { display: inline-block; background: #e3f2fd; color: #1565c0; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; margin-right: 4px; }
</style>
</head>
<body>
<div class="container">
  <h1>Agent Evaluation Report</h1>
  <p>Run ID: <code>${runId}</code> &middot; Generated: ${generatedAt} &middot; Engine: <code>${config.engine}</code></p>

  <div class="summary">
    <div class="card"><div class="label">Total</div><div class="value">${summary.total}</div></div>
    <div class="card"><div class="label">Passed</div><div class="value">${summary.passed}</div></div>
    <div class="card"><div class="label">Failed</div><div class="value">${summary.failed}</div></div>
    <div class="card"><div class="label">Score</div><div class="value">${summary.score.toFixed(3)}</div></div>
  </div>

  <h2>Dimensions</h2>
  <table>
    <thead><tr><th>Dimension</th><th>Score</th></tr></thead>
    <tbody>${dimensionRows}</tbody>
  </table>

  <h2>Categories</h2>
  <table>
    <thead><tr><th>Category</th><th>Total</th><th>Passed</th><th>Failed</th><th>Score</th></tr></thead>
    <tbody>${categoryRows}</tbody>
  </table>

  <h2>Cases</h2>
  <table>
    <thead><tr><th>ID</th><th>Title</th><th>Category</th><th>Status</th><th>Score</th></tr></thead>
    <tbody>${caseRows}</tbody>
  </table>
</div>
</body>
</html>
`;
}
