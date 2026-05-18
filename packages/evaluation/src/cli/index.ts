#!/usr/bin/env node
import crypto from 'node:crypto';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import config from '../evaluation.config';
import { loadBenchmarkCases } from '../benchmarks/cases';
import { evaluateCases } from '../core/evaluator';
import {
  evaluationCategories,
  evaluationEngines,
  evaluationTransports,
  type EvaluationCategory,
  type EvaluationEngine,
  type EvaluationTransport,
} from '../core/types';
import { saveReport } from '../persistence/file-store';

type ReportFormat = 'json' | 'md' | 'html' | 'all';

interface CliOptions {
  authToken?: string;
  baseUrl: string;
  baseline?: string;
  categories: EvaluationCategory[];
  compare?: string[];
  cookie?: string;
  dryRun: boolean;
  engine: EvaluationEngine;
  format: ReportFormat;
  full: boolean;
  help: boolean;
  limit?: number;
  mastraModel?: string;
  maxIterations: number;
  model: string;
  outputDir: string;
  provider: string;
  regression: boolean;
  replay?: string;
  threshold: number;
  timeoutMs: number;
  transport: EvaluationTransport;
  userId: number;
  verbose: boolean;
}

function nextArg(argv: string[], i: number, flag: string): string {
  const next = argv[i + 1];
  if (next === undefined || next.startsWith('--')) {
    throw new Error(`Missing value for ${flag}`);
  }
  return next;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    baseUrl: 'http://localhost:3000',
    categories: [],
    dryRun: false,
    engine: config.engine,
    format: 'all',
    full: false,
    help: false,
    mastraModel: undefined,
    maxIterations: 15,
    model: 'gpt-5.5',
    outputDir: config.outputDir,
    provider: 'openai',
    regression: false,
    threshold: config.threshold,
    timeoutMs: 60000,
    transport: config.transport,
    userId: 1,
    verbose: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--full' || arg === '-f') options.full = true;
    else if (arg === '--verbose' || arg === '-v') options.verbose = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--regression' || arg === '-r') options.regression = true;
    else if (arg === '--ci') { /* no-op, accepted for compatibility */ }
    else if (arg === '--auth-token') { options.authToken = nextArg(argv, i, arg); i += 1; }
    else if (arg === '--base-url') { options.baseUrl = nextArg(argv, i, arg); i += 1; }
    else if (arg === '--baseline') { options.baseline = nextArg(argv, i, arg); i += 1; }
    else if (arg === '--compare') {
      options.compare = nextArg(argv, i, arg).split(',').map((s) => s.trim());
      i += 1;
    }
    else if (arg === '--cookie') { options.cookie = nextArg(argv, i, arg); i += 1; }
    else if (arg === '--format') {
      const value = nextArg(argv, i, arg);
      i += 1;
      if (!['json', 'md', 'html', 'all'].includes(value)) {
        throw new Error(`Unknown format: ${value}. Use json, md, html, or all.`);
      }
      options.format = value as ReportFormat;
    }
    else if (arg === '--mastra-model') { options.mastraModel = nextArg(argv, i, arg); i += 1; }
    else if (arg === '--max-iterations') { options.maxIterations = Number(nextArg(argv, i, arg)); i += 1; }
    else if (arg === '--model') { options.model = nextArg(argv, i, arg); i += 1; }
    else if (arg === '--output' || arg === '-o') { options.outputDir = nextArg(argv, i, arg); i += 1; }
    else if (arg === '--provider') { options.provider = nextArg(argv, i, arg); i += 1; }
    else if (arg === '--replay') { options.replay = nextArg(argv, i, arg); i += 1; }
    else if (arg === '--threshold') { options.threshold = Number(nextArg(argv, i, arg)); i += 1; }
    else if (arg === '--timeout-ms') { options.timeoutMs = Number(nextArg(argv, i, arg)); i += 1; }
    else if (arg === '--user-id') { options.userId = Number(nextArg(argv, i, arg)); i += 1; }
    else if (arg === '--category' || arg === '-c') {
      const value = nextArg(argv, i, arg);
      i += 1;
      if (!evaluationCategories.includes(value as EvaluationCategory)) {
        throw new Error(`Unknown category: ${value}`);
      }
      options.categories.push(value as EvaluationCategory);
    }
    else if (arg === '--engine' || arg === '-e') {
      const value = nextArg(argv, i, arg);
      i += 1;
      if (!evaluationEngines.includes(value as EvaluationEngine)) {
        throw new Error(`Unknown engine: ${value}`);
      }
      options.engine = value as EvaluationEngine;
    }
    else if (arg === '--limit') { options.limit = Number(nextArg(argv, i, arg)); i += 1; }
    else if (arg === '--transport') {
      const value = nextArg(argv, i, arg);
      i += 1;
      if (!evaluationTransports.includes(value as EvaluationTransport)) {
        throw new Error(`Unknown transport: ${value}`);
      }
      options.transport = value as EvaluationTransport;
    }
    else if (arg === '--persist') {
      console.warn('[Warning] --persist option is deprecated. Use main app API for database persistence.');
    }
    else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (options.categories.length === 0) {
    options.categories = options.full ? config.categories : [];
  }

  return options;
}

function printHelp(): void {
  console.log(`Agent evaluation CLI

Usage:
  pnpm eval                         Start interactive mode
  pnpm eval --full --ci             Run all MVP benchmark cases
  pnpm eval -c asset-query          Run one category
  pnpm eval -c asset-query --engine hermes --model gpt-5.5
  pnpm eval --compare deepagents,claude   Compare multiple engines
  pnpm eval --regression --baseline v1.2.0  Run regression against baseline
  pnpm eval --replay <session-id>    Replay a recorded session

Note: For database persistence, use the main application API instead of CLI.

Options:
  -c, --category <name>            Category to evaluate (repeatable)
      --engine, -e <name>          Evaluation engine: ${evaluationEngines.join(', ')}
      --transport <type>           Transport: web-api (default), direct
      --model <model>              Model for evaluation, default gpt-5.5
      --provider <name>            Provider: openai (default), anthropic
      --threshold <number>         Passing threshold, default ${config.threshold}
      --limit <number>             Limit number of cases
  -f, --full                       Run all categories
      --max-iterations <number>    Hermes max tool iterations, default 4
      --mastra-model <model>       Mastra LLM-as-Judge model, e.g. openai/gpt-4o-mini
      --format <json|md|html|all>  Report format, default all
  -o, --output <dir>               Report output directory
      --base-url <url>             Base URL for web-api transport
      --user-id <number>           User ID for direct transport
      --auth-token <token>         Auth token for web-api transport
      --cookie <cookie>            Cookie for web-api transport
      --timeout-ms <ms>            Timeout per case, default 60000
      --compare <engines>          Comma-separated engine list for comparison
      --regression, -r             Run regression test
      --baseline <version>         Baseline version for regression
      --replay <session-id>        Replay a recorded session
      --dry-run                    Preview what would run without executing
      --verbose, -v                Enable verbose logging
      --ci                         Explicit CI mode marker
  -h, --help                       Show help
`);
}

async function interactiveOptions(): Promise<CliOptions> {
  const rl = readline.createInterface({ input, output });
  try {
    const categoryAnswer = await rl.question(
      `Category (${evaluationCategories.join(', ')}, or all) [all]: `,
    );
    const engineAnswer = await rl.question(`Engine (${evaluationEngines.join(', ')}) [${config.engine}]: `);
    const selectedCategories =
      categoryAnswer.trim() && categoryAnswer.trim() !== 'all'
        ? categoryAnswer.split(',').map((value) => value.trim() as EvaluationCategory)
        : config.categories;

    for (const category of selectedCategories) {
      if (!evaluationCategories.includes(category)) throw new Error(`Unknown category: ${category}`);
    }

    const engine = (engineAnswer.trim() || config.engine) as EvaluationEngine;
    if (!evaluationEngines.includes(engine)) throw new Error(`Unknown engine: ${engine}`);

    return {
      baseUrl: 'http://localhost:3000',
      categories: selectedCategories,
      dryRun: false,
      engine,
      format: 'all',
      full: selectedCategories.length === config.categories.length,
      help: false,
      mastraModel: undefined,
      maxIterations: 15,
      model: 'gpt-5.5',
      outputDir: config.outputDir,
      provider: 'openai',
      regression: false,
      threshold: config.threshold,
      timeoutMs: 60000,
      transport: config.transport,
      userId: 1,
      verbose: false,
    };
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  const rawArgs = process.argv.slice(2);
  const options = rawArgs.length === 0 ? await interactiveOptions() : parseArgs(rawArgs);

  if (options.help) {
    printHelp();
    return;
  }

  if (options.dryRun) {
    const categories = options.categories.length > 0 ? options.categories : config.categories;
    const cases = loadBenchmarkCases(categories).slice(0, options.limit);
    console.log(`[Dry Run] Would evaluate ${cases.length} cases across categories: ${categories.join(', ')}`);
    console.log(`[Dry Run] Engine: ${options.engine}, Transport: ${options.transport}`);
    if (options.mastraModel) console.log(`[Dry Run] Mastra model: ${options.mastraModel}`);
    if (options.compare) console.log(`[Dry Run] Compare engines: ${options.compare.join(', ')}`);
    if (options.regression) console.log(`[Dry Run] Regression mode, baseline: ${options.baseline ?? 'latest'}`);
    if (options.replay) console.log(`[Dry Run] Replay session: ${options.replay}`);
    return;
  }

  const categories = options.categories.length > 0 ? options.categories : config.categories;
  const cases = loadBenchmarkCases(categories).slice(0, options.limit);
  const runId = `eval-${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID().slice(0, 8)}`;

  const report = await evaluateCases(cases, {
    categories,
    engine: options.engine,
    mastraModel: options.mastraModel,
    realRun: {
      model: options.model,
      provider: options.provider,
      timeoutMs: options.timeoutMs,
      userId: options.userId,
    },
    runId,
    threshold: options.threshold,
    transport: options.transport,
    webApiRun: {
      authToken: options.authToken,
      baseUrl: options.baseUrl,
      cookie: options.cookie,
      maxIterations: options.maxIterations,
      model: options.model,
      provider: options.provider,
      timeoutMs: options.timeoutMs,
    },
  });

  const paths = await saveReport(report, path.resolve(options.outputDir), { format: options.format });

  console.log(`Evaluation run ${report.runId}`);
  console.log(`Cases: ${report.summary.total}, passed: ${report.summary.passed}, failed: ${report.summary.failed}`);
  console.log(`Score: ${report.summary.score.toFixed(3)}`);

  if (paths.jsonPath) console.log(`JSON: ${paths.jsonPath}`);
  if (paths.markdownPath) console.log(`Markdown: ${paths.markdownPath}`);
  if (paths.htmlPath) console.log(`HTML: ${paths.htmlPath}`);

  if (options.regression) {
    console.log(`\n[Regression] Baseline comparison not yet implemented.`);
  }
  if (options.compare) {
    console.log(`\n[Compare] Engine comparison not yet implemented.`);
  }
  if (options.replay) {
    console.log(`\n[Replay] Session replay not yet implemented.`);
  }

  if (report.summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  process.exitCode = 1;
});
