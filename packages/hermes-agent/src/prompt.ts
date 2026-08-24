/**
 * System prompt builder — modular, stateless prompt assembly.
 *
 * Ported from Python hermes-agent's agent/prompt_builder.py.
 *
 * All functions are stateless. The agent calls buildSystemPrompt() to assemble
 * pieces from identity, context files, platform hints, memory, and tool guidance.
 *
 * Design principle (from Python version):
 *   The system prompt is NEVER persisted — it's rebuilt at every session start.
 *   This decouples prompt maintenance from session history.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ============== Identity ==============

export const DEFAULT_AGENT_IDENTITY =
  'You are Hermes Agent, an intelligent AI assistant. ' +
  'You are helpful, knowledgeable, and direct. You assist users with a wide ' +
  'range of tasks including answering questions, writing and editing code, ' +
  'analyzing information, creative work, and executing actions via your tools. ' +
  'You communicate clearly, admit uncertainty when appropriate, and prioritize ' +
  'being genuinely useful over being verbose. ' +
  'Be targeted and efficient in your exploration and investigations.';

// ============== Tool Guidance ==============

export const MEMORY_GUIDANCE =
  'You have persistent memory across sessions. Save durable facts using the memory ' +
  'tool: user preferences, environment details, tool quirks, and stable conventions. ' +
  'Memory is injected into every turn, so keep it compact and focused on facts that ' +
  'will still matter later.\n' +
  'Write memories as declarative facts, not instructions to yourself. ' +
  "'User prefers concise responses' ✓ — 'Always respond concisely' ✗.";

export const CREATE_UI_ARTIFACT_GUIDANCE =
  '# Generative UI guidance\n' +
  'You have a `create_ui_artifact` tool that renders rich interactive cards in the chat.\n\n' +
  '## When to use\n' +
  '- User asks about a stock price or quote → `stock_quote_card`\n' +
  '- User asks about fund performance or details → `fund_detail_panel`\n' +
  '- User wants data visualized as a chart → `data_chart`\n' +
  '- User expresses intent to buy/sell a stock → `trade_intent_card`\n\n' +
  '## When NOT to use\n' +
  '- General conversation with no financial data context\n' +
  '- You do not have the actual data yet (fetch data first, then render)\n\n' +
  '## Rules\n' +
  '- Use the exact `artifact_type` values: stock_quote_card, fund_detail_panel, data_chart, trade_intent_card.\n' +
  '- Fill ALL required props for the chosen type. Check the props parameter description for the schema.\n' +
  '- `fallback_text` must be a meaningful plain-text summary of the data, not a placeholder.\n' +
  '- For `trade_intent_card`, always generate a unique `idempotencyKey` (e.g. UUID) and set `status` to "pending".\n' +
  '- For `data_chart`, `series` must have at least one entry with a non-empty `data` array.\n' +
  '- Prefer calling the tool over describing what the card would look like in text.\n' +
  '- After calling `create_ui_artifact`, do NOT repeat the data shown in the card as text. ' +
  'The card already displays the information visually. ' +
  'Instead, provide a brief transition sentence (e.g. "这是XX的最新行情") or follow-up analysis that adds value beyond the card content.';

export const TOOL_USE_ENFORCEMENT =
  '# Tool-use enforcement\n' +
  'You MUST use your tools to take action — do not describe what you would do ' +
  'or plan to do without actually doing it. When you say you will perform an ' +
  "action, you MUST immediately make the corresponding tool call in the same " +
  'response. Never end your turn with a promise of future action — execute it now.\n' +
  'Keep working until the task is actually complete. Do not stop with a summary of ' +
  'what you plan to do next time. Every response should either (a) contain tool ' +
  'calls that make progress, or (b) deliver a final result to the user.';

// ============== Platform Hints ==============

export const PLATFORM_HINTS: Record<string, string> = {
  cli:
    'You are a CLI AI Agent. Try not to use markdown but simple text ' +
    'renderable inside a terminal. ' +
    'When referring to a file you created or changed, just state its ' +
    'absolute path in plain text; the user can open it from there.',
  telegram:
    'You are on Telegram. Standard markdown is automatically converted. ' +
    'Supported: **bold**, *italic*, `inline code`, ```code blocks```, [links](url). ' +
    'Keep messages concise and chat-friendly.',
  discord:
    'You are in a Discord server. Discord renders standard markdown. ' +
    'Keep messages under 2000 characters when possible.',
  slack:
    'You are in a Slack workspace. Slack uses mrkdwn format — ' +
    '*bold*, _italic_, `code`, ```code blocks```. ',
  whatsapp:
    'You are on WhatsApp. Please do not use markdown as it does not render. ' +
    'Keep messages concise and conversational.',
  email:
    'You are communicating via email. Write clear, well-structured responses. ' +
    'Use plain text formatting. Keep responses concise but complete.',
  web:
    'You are in a web chat interface. Full markdown rendering is supported ' +
    'including headers, lists, tables, and code blocks with syntax highlighting.',
};

// ============== Context File Scanning ==============

const CONTEXT_THREAT_PATTERNS: [RegExp, string][] = [
  [/ignore\s+(previous|all|above|prior)\s+instructions/i, 'prompt_injection'],
  [/do\s+not\s+tell\s+the\s+user/i, 'deception_hide'],
  [/system\s+prompt\s+override/i, 'sys_prompt_override'],
  [/disregard\s+(your|all|any)\s+(instructions|rules|guidelines)/i, 'disregard_rules'],
  [/curl\s+[^\n]*\$\{?\w*(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|API)/i, 'exfil_curl'],
  [/cat\s+[^\n]*(\.env|credentials|\.netrc|\.pgpass)/i, 'read_secrets'],
];

const INVISIBLE_CHARS = new Set([
  '\u200b', '\u200c', '\u200d', '\u2060', '\ufeff',
  '\u202a', '\u202b', '\u202c', '\u202d', '\u202e',
]);

function scanContextContent(content: string, filename: string): string {
  const findings: string[] = [];

  for (const char of INVISIBLE_CHARS) {
    if (content.includes(char)) {
      findings.push(`invisible unicode U+${char.codePointAt(0)!.toString(16).padStart(4, '0').toUpperCase()}`);
      break;
    }
  }

  for (const [pattern, pid] of CONTEXT_THREAT_PATTERNS) {
    if (pattern.test(content)) {
      findings.push(pid);
    }
  }

  if (findings.length > 0) {
    return `[BLOCKED: ${filename} contained potential prompt injection (${findings.join(', ')}). Content not loaded.]`;
  }

  return content;
}

// ============== Context File Loading ==============

const CONTEXT_FILE_MAX_CHARS = 20_000;

function truncateContent(content: string, filename: string, maxChars = CONTEXT_FILE_MAX_CHARS): string {
  if (content.length <= maxChars) return content;
  const headChars = Math.floor(maxChars * 0.7);
  const tailChars = Math.floor(maxChars * 0.2);
  const head = content.slice(0, headChars);
  const tail = content.slice(-tailChars);
  return `${head}\n\n[...truncated ${filename}: kept ${headChars}+${tailChars} of ${content.length} chars]\n\n${tail}`;
}

function stripYamlFrontmatter(content: string): string {
  if (content.startsWith('---')) {
    const end = content.indexOf('\n---', 3);
    if (end !== -1) {
      const body = content.slice(end + 4).replace(/^\n+/, '');
      return body || content;
    }
  }
  return content;
}

function findGitRoot(start: string): string | null {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, '.git'))) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

/**
 * Load the first matching context file from the project directory.
 *
 * Priority (first found wins):
 *   1. HERMES.md / .hermes.md (walk to git root)
 *   2. AGENTS.md
 *   3. CLAUDE.md
 *   4. .cursorrules
 */
export function loadContextFiles(cwd?: string): string {
  const dir = path.resolve(/*turbopackIgnore: true*/ cwd ?? process.cwd());
  const sections: string[] = [];

  const projectContext =
    loadHermesMd(dir) ||
    loadNamedMd(dir, ['AGENTS.md', 'agents.md']) ||
    loadNamedMd(dir, ['CLAUDE.md', 'claude.md']) ||
    loadCursorRules(dir);

  if (projectContext) sections.push(projectContext);

  if (sections.length === 0) return '';
  return (
    '# Project Context\n\n' +
    'The following project context files have been loaded:\n\n' +
    sections.join('\n')
  );
}

function loadHermesMd(cwd: string): string {
  const names = ['.hermes.md', 'HERMES.md'];
  const gitRoot = findGitRoot(cwd);
  let current = path.resolve(cwd);

  while (true) {
    for (const name of names) {
      const candidate = path.join(/*turbopackIgnore: true*/ current, name);
      if (fs.existsSync(/*turbopackIgnore: true*/ candidate)) {
        try {
          let content = fs.readFileSync(/*turbopackIgnore: true*/ candidate, 'utf-8').trim();
          if (!content) continue;
          content = stripYamlFrontmatter(content);
          content = scanContextContent(content, name);
          return truncateContent(`## ${name}\n\n${content}`, name);
        } catch { /* skip */ }
      }
    }
    if (gitRoot && current === gitRoot) break;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return '';
}

function loadNamedMd(cwd: string, names: string[]): string {
  for (const name of names) {
    const candidate = path.join(cwd, name);
    if (fs.existsSync(candidate)) {
      try {
        let content = fs.readFileSync(candidate, 'utf-8').trim();
        if (!content) continue;
        content = scanContextContent(content, name);
        return truncateContent(`## ${name}\n\n${content}`, name);
      } catch { /* skip */ }
    }
  }
  return '';
}

function loadCursorRules(cwd: string): string {
  const parts: string[] = [];

  const cursorrules = path.join(cwd, '.cursorrules');
  if (fs.existsSync(cursorrules)) {
    try {
      const content = fs.readFileSync(cursorrules, 'utf-8').trim();
      if (content) {
        parts.push(`## .cursorrules\n\n${scanContextContent(content, '.cursorrules')}`);
      }
    } catch { /* skip */ }
  }

  const rulesDir = path.join(cwd, '.cursor', 'rules');
  if (fs.existsSync(rulesDir)) {
    try {
      const files = fs.readdirSync(rulesDir).filter((f) => f.endsWith('.mdc')).sort();
      for (const file of files) {
        const content = fs.readFileSync(path.join(rulesDir, file), 'utf-8').trim();
        if (content) {
          parts.push(`## .cursor/rules/${file}\n\n${scanContextContent(content, file)}`);
        }
      }
    } catch { /* skip */ }
  }

  if (parts.length === 0) return '';
  return truncateContent(parts.join('\n\n'), '.cursorrules');
}

// ============== System Prompt Builder ==============

export interface PromptBuilderConfig {
  /** Custom identity (replaces DEFAULT_AGENT_IDENTITY) */
  identity?: string;
  /** Custom system prompt (appended after identity) */
  systemPrompt?: string;
  /** Platform hint key (e.g. 'cli', 'telegram', 'web') */
  platform?: string;
  /** Working directory for context file discovery */
  cwd?: string;
  /** Whether to load context files (AGENTS.md, CLAUDE.md, etc.) Default: true */
  loadContextFiles?: boolean;
  /** Whether to include tool-use enforcement guidance. Default: true */
  toolEnforcement?: boolean;
  /** Memory snapshot to include (from MemoryStore.formatForSystemPrompt) */
  memoryBlock?: string;
  /** List of available tool names (for conditional guidance) */
  toolNames?: string[];
}

/**
 * Build the full system prompt from modular layers.
 *
 * Layers (in order, matching Python implementation):
 *   1. Agent identity (SOUL.md or DEFAULT_AGENT_IDENTITY)
 *   2. User/custom system prompt
 *   3. Tool-use enforcement guidance
 *   4. Memory snapshot
 *   5. Context files (AGENTS.md, CLAUDE.md, .cursorrules)
 *   6. Current date & time
 *   7. Platform-specific formatting hint
 */
export function buildSystemPrompt(config: PromptBuilderConfig = {}): string {
  const parts: string[] = [];

  // 1. Identity
  parts.push(config.identity ?? DEFAULT_AGENT_IDENTITY);

  // 2. Custom system prompt
  if (config.systemPrompt) {
    parts.push(config.systemPrompt);
  }

  // 3. Tool-use enforcement
  if (config.toolEnforcement !== false) {
    parts.push(TOOL_USE_ENFORCEMENT);
  }

  // 4. Tool-specific guidance
  const toolNames = new Set(config.toolNames ?? []);
  if (toolNames.has('memory')) {
    parts.push(MEMORY_GUIDANCE);
  }
  if (toolNames.has('create_ui_artifact')) {
    parts.push(CREATE_UI_ARTIFACT_GUIDANCE);
  }

  // 5. Memory
  if (config.memoryBlock) {
    parts.push(config.memoryBlock);
  }

  // 6. Context files
  if (config.loadContextFiles !== false) {
    const contextContent = loadContextFiles(config.cwd);
    if (contextContent) {
      parts.push(contextContent);
    }
  }

  // 7. Date & time
  const now = new Date();
  parts.push(`Current time: ${now.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}`);

  // 8. Platform hint
  const platformKey = (config.platform ?? '').toLowerCase().trim();
  if (platformKey && PLATFORM_HINTS[platformKey]) {
    parts.push(PLATFORM_HINTS[platformKey]);
  }

  return parts
    .filter((p) => p.trim())
    .map((p) => p.trim())
    .join('\n\n');
}
