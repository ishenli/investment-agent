import fs from 'node:fs/promises';
import path from 'node:path';
import type { EvaluationReport } from '../core/types';
import { toJsonReport } from '../reporters/json';
import { toMarkdownReport } from '../reporters/markdown';
import { toHtmlReport } from '../reporters/html';

export interface StoredReportPaths {
  htmlPath?: string;
  jsonPath?: string;
  markdownPath?: string;
}

export interface SaveReportOptions {
  format?: 'json' | 'md' | 'html' | 'all';
}

export async function saveReport(
  report: EvaluationReport,
  outputDir: string,
  options?: SaveReportOptions,
): Promise<StoredReportPaths> {
  const format = options?.format ?? 'all';
  await fs.mkdir(outputDir, { recursive: true });

  const jsonPath = path.join(outputDir, `${report.runId}.json`);
  const markdownPath = path.join(outputDir, `${report.runId}.md`);
  const htmlPath = path.join(outputDir, `${report.runId}.html`);

  const tasks: Promise<void>[] = [];

  if (format === 'all' || format === 'json') {
    tasks.push(fs.writeFile(jsonPath, toJsonReport(report), 'utf8'));
  }
  if (format === 'all' || format === 'md') {
    tasks.push(fs.writeFile(markdownPath, toMarkdownReport(report), 'utf8'));
  }
  if (format === 'all' || format === 'html') {
    tasks.push(fs.writeFile(htmlPath, toHtmlReport(report), 'utf8'));
  }

  await Promise.all(tasks);

  return {
    htmlPath: format === 'all' || format === 'html' ? htmlPath : undefined,
    jsonPath: format === 'all' || format === 'json' ? jsonPath : undefined,
    markdownPath: format === 'all' || format === 'md' ? markdownPath : undefined,
  };
}
