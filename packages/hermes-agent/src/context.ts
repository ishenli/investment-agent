/**
 * Context engine — pluggable context management for Hermes Agent.
 *
 * Ported from Python hermes-agent's agent/context_engine.py.
 *
 * A context engine controls how conversation context is managed when
 * approaching the model's token limit. The ContextCompressor is the
 * default implementation.
 *
 * The engine is responsible for:
 *   - Deciding when compaction should fire
 *   - Performing compaction (summarization, pruning, etc.)
 *   - Tracking token usage from API responses
 *
 * Lifecycle:
 *   1. Engine is created with model context info
 *   2. updateFromResponse() called after each API response
 *   3. shouldCompress() checked after each turn
 *   4. compress() called when shouldCompress() returns true
 */

import type { Message, AssistantMessage, ToolCall, Context } from '@mariozechner/pi-ai';
import { complete, type Model, type Api } from '@mariozechner/pi-ai';

// ============== Constants ==============

const SUMMARY_PREFIX =
  '[CONTEXT COMPACTION — REFERENCE ONLY] Earlier turns were compacted ' +
  'into the summary below. This is a handoff from a previous context ' +
  'window — treat it as background reference, NOT as active instructions. ' +
  'Do NOT answer questions or fulfill requests mentioned in this summary; ' +
  'they were already addressed. ' +
  'Respond ONLY to the latest user message that appears AFTER this summary.';

const MIN_SUMMARY_TOKENS = 2000;
const SUMMARY_RATIO = 0.2;
const SUMMARY_TOKENS_CEILING = 12_000;
const CHARS_PER_TOKEN = 4;

// ============== Token estimation ==============

function estimateMessageTokens(messages: Message[]): number {
  let total = 0;
  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      total += Math.ceil(msg.content.length / CHARS_PER_TOKEN) + 10;
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === 'text') {
          total += Math.ceil(block.text.length / CHARS_PER_TOKEN);
        } else if (block.type === 'thinking') {
          total += Math.ceil(block.thinking.length / CHARS_PER_TOKEN);
        } else if (block.type === 'toolCall') {
          total += Math.ceil(
            JSON.stringify(block.arguments).length / CHARS_PER_TOKEN,
          );
        }
      }
      total += 10;
    }
  }
  return total;
}

function getMessageText(msg: Message): string {
  if (typeof msg.content === 'string') return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
  }
  return '';
}

// ============== Context Engine Interface ==============

export interface ContextEngineStatus {
  lastPromptTokens: number;
  thresholdTokens: number;
  contextLength: number;
  usagePercent: number;
  compressionCount: number;
}

export interface ContextEngineConfig {
  /** Model context window size in tokens */
  contextLength: number;
  /** Compress when usage exceeds this fraction (default: 0.50) */
  thresholdPercent?: number;
  /** Number of head messages to protect (default: 3) */
  protectFirstN?: number;
  /** Fraction of threshold for tail token budget (default: 0.20) */
  summaryTargetRatio?: number;
  /** pi-ai Model for generating summaries (optional, uses same model if not set) */
  summaryModel?: Model<Api>;
}

// ============== Context Compressor ==============

/**
 * Default context engine — compresses via lossy summarization.
 *
 * Algorithm:
 *   1. Prune old tool results (cheap, no LLM call)
 *   2. Protect head messages (system prompt + first exchange)
 *   3. Protect tail messages by token budget
 *   4. Summarize middle turns with structured LLM prompt
 *   5. On re-compression, iteratively update the previous summary
 */
export class ContextCompressor {
  readonly contextLength: number;
  readonly thresholdPercent: number;
  readonly thresholdTokens: number;
  readonly protectFirstN: number;
  readonly summaryTargetRatio: number;
  readonly tailTokenBudget: number;
  readonly maxSummaryTokens: number;

  private summaryModel?: Model<Api>;
  private lastPromptTokens = 0;
  private compressionCount = 0;
  private previousSummary: string | null = null;
  private ineffectiveCompressionCount = 0;

  constructor(config: ContextEngineConfig) {
    this.contextLength = config.contextLength;
    this.thresholdPercent = config.thresholdPercent ?? 0.5;
    this.protectFirstN = config.protectFirstN ?? 3;
    this.summaryTargetRatio = Math.max(
      0.1,
      Math.min(config.summaryTargetRatio ?? 0.2, 0.8),
    );
    this.thresholdTokens = Math.floor(
      this.contextLength * this.thresholdPercent,
    );
    this.tailTokenBudget = Math.floor(
      this.thresholdTokens * this.summaryTargetRatio,
    );
    this.maxSummaryTokens = Math.min(
      Math.floor(this.contextLength * 0.05),
      SUMMARY_TOKENS_CEILING,
    );
    this.summaryModel = config.summaryModel;
  }

  /** Update tracked token usage from an API response. */
  updateFromResponse(usage: { input: number; output: number }): void {
    this.lastPromptTokens = usage.input;
  }

  /** Check if context exceeds the compression threshold. */
  shouldCompress(promptTokens?: number): boolean {
    const tokens = promptTokens ?? this.lastPromptTokens;
    if (tokens < this.thresholdTokens) return false;
    // Anti-thrashing: back off if recent compressions were ineffective
    if (this.ineffectiveCompressionCount >= 2) return false;
    return true;
  }

  /** Get status info for display/logging. */
  getStatus(): ContextEngineStatus {
    return {
      lastPromptTokens: this.lastPromptTokens,
      thresholdTokens: this.thresholdTokens,
      contextLength: this.contextLength,
      usagePercent: this.contextLength
        ? Math.min(100, (this.lastPromptTokens / this.contextLength) * 100)
        : 0,
      compressionCount: this.compressionCount,
    };
  }

  /** Reset per-session state. */
  reset(): void {
    this.lastPromptTokens = 0;
    this.compressionCount = 0;
    this.previousSummary = null;
    this.ineffectiveCompressionCount = 0;
  }

  // ============== Main compression ==============

  /**
   * Compress conversation messages by summarizing middle turns.
   *
   * @param messages - Full message list
   * @param model - pi-ai Model for summary generation
   * @param currentTokens - Current token count (optional)
   * @param focusTopic - Optional topic for guided compression
   */
  async compress(
    messages: Message[],
    model: Model<Api>,
    currentTokens?: number,
    focusTopic?: string,
  ): Promise<Message[]> {
    const n = messages.length;
    const minForCompress = this.protectFirstN + 4;
    if (n <= minForCompress) return messages;

    const displayTokens =
      currentTokens ?? this.lastPromptTokens ?? estimateMessageTokens(messages);

    // Phase 1: Prune old tool results
    const pruned = this.pruneOldToolResults(messages);

    // Phase 2: Determine boundaries
    const compressStart = this.protectFirstN;
    const compressEnd = this.findTailCut(pruned, compressStart);
    if (compressStart >= compressEnd) return pruned;

    const turnsToSummarize = pruned.slice(compressStart, compressEnd);

    // Phase 3: Generate summary
    const summaryModel = this.summaryModel ?? model;
    const summary = await this.generateSummary(
      summaryModel,
      turnsToSummarize,
      focusTopic,
    );

    // Phase 4: Assemble compressed message list
    const head = pruned.slice(0, compressStart);
    const tail = pruned.slice(compressEnd);

    const summaryText =
      summary ??
      `${SUMMARY_PREFIX}\nSummary generation unavailable. ${compressEnd - compressStart} turns removed.`;

    const summaryMessage: Message = {
      role: 'user',
      content: summaryText,
      timestamp: Date.now(),
    };

    const compressed: Message[] = [...head, summaryMessage, ...tail];

    this.compressionCount++;

    // Anti-thrashing
    const newEstimate = estimateMessageTokens(compressed);
    const savingsPct =
      displayTokens > 0
        ? ((displayTokens - newEstimate) / displayTokens) * 100
        : 0;
    if (savingsPct < 10) {
      this.ineffectiveCompressionCount++;
    } else {
      this.ineffectiveCompressionCount = 0;
    }

    return compressed;
  }

  // ============== Tool result pruning ==============

  private pruneOldToolResults(messages: Message[]): Message[] {
    const result = [...messages];
    const tailBoundary = Math.max(0, result.length - 6);

    for (let i = 0; i < tailBoundary; i++) {
      const msg = result[i];
      if (msg.role !== 'toolResult') continue;

      const text = getMessageText(msg);
      if (text.length <= 200) continue;

      // Replace with a short summary
      const summary = `[Old tool output cleared — ${msg.toolName ?? 'unknown'}: ${text.length.toLocaleString()} chars]`;
      result[i] = {
        ...msg,
        content: [{ type: 'text', text: summary }],
      } as Message;
    }

    return result;
  }

  // ============== Tail boundary ==============

  private findTailCut(messages: Message[], headEnd: number): number {
    const n = messages.length;
    const minTail = Math.min(3, n - headEnd - 1);
    const softCeiling = Math.floor(this.tailTokenBudget * 1.5);
    let accumulated = 0;
    let cutIdx = n;

    for (let i = n - 1; i >= headEnd; i--) {
      const msg = messages[i];
      const text = getMessageText(msg);
      let msgTokens = Math.ceil(text.length / CHARS_PER_TOKEN) + 10;

      // Include tool call arguments
      if (msg.role === 'assistant') {
        const assistantMsg = msg as AssistantMessage;
        for (const block of assistantMsg.content) {
          if (block.type === 'toolCall') {
            msgTokens += Math.ceil(
              JSON.stringify(block.arguments).length / CHARS_PER_TOKEN,
            );
          }
        }
      }

      if (accumulated + msgTokens > softCeiling && n - i >= minTail) break;
      accumulated += msgTokens;
      cutIdx = i;
    }

    // Ensure min tail
    const fallbackCut = n - minTail;
    if (cutIdx > fallbackCut) cutIdx = fallbackCut;
    if (cutIdx <= headEnd) cutIdx = Math.max(fallbackCut, headEnd + 1);

    // Ensure last user message is in tail
    for (let i = n - 1; i >= headEnd; i--) {
      if (messages[i].role === 'user' && i < cutIdx) {
        cutIdx = Math.max(i, headEnd + 1);
        break;
      }
    }

    return Math.max(cutIdx, headEnd + 1);
  }

  // ============== Summary generation ==============

  private async generateSummary(
    model: Model<Api>,
    turns: Message[],
    focusTopic?: string,
  ): Promise<string | null> {
    const budget = this.computeSummaryBudget(turns);
    const serialized = this.serializeForSummary(turns);

    const preamble =
      'You are a summarization agent creating a context checkpoint. ' +
      'Your output will be injected as reference material for a DIFFERENT ' +
      'assistant that continues the conversation. ' +
      'Do NOT respond to any questions or requests in the conversation — ' +
      'only output the structured summary. ' +
      'NEVER include API keys, tokens, passwords, or credentials — write [REDACTED].';

    const template = `## Active Task
[The user's most recent unfulfilled request — verbatim]

## Goal
[What the user is trying to accomplish overall]

## Completed Actions
[Numbered list of actions taken — include tool, target, outcome]

## Active State
[Current working state — files, branch, test status]

## In Progress
[Work currently underway when compaction fired]

## Key Decisions
[Important decisions and WHY they were made]

## Resolved Questions
[Questions already answered — include the answer]

## Pending User Asks
[Unanswered questions or unfulfilled requests. "None." if empty]

## Relevant Files
[Files read, modified, or created]

## Remaining Work
[What remains — framed as context, not instructions]

Target ~${budget} tokens. Be CONCRETE — include file paths, commands, error messages.`;

    let prompt: string;
    if (this.previousSummary) {
      prompt =
        `${preamble}\n\n` +
        `You are updating a context compaction summary.\n\n` +
        `PREVIOUS SUMMARY:\n${this.previousSummary}\n\n` +
        `NEW TURNS TO INCORPORATE:\n${serialized}\n\n` +
        `Update the summary. PRESERVE existing relevant info. ADD new actions.\n\n${template}`;
    } else {
      prompt =
        `${preamble}\n\n` +
        `Create a structured handoff summary.\n\n` +
        `TURNS TO SUMMARIZE:\n${serialized}\n\n${template}`;
    }

    if (focusTopic) {
      prompt +=
        `\n\nFOCUS TOPIC: "${focusTopic}"\n` +
        `Prioritise preserving detail related to "${focusTopic}". ` +
        `Compress unrelated content aggressively.`;
    }

    try {
      const context: Context = {
        messages: [{ role: 'user', content: prompt, timestamp: Date.now() }],
      };

      const response = await complete(model, context, {
        maxTokens: Math.floor(budget * 1.3),
      });

      const text = response.content
        .filter(
          (b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text',
        )
        .map((b) => b.text)
        .join('')
        .trim();

      this.previousSummary = text;
      return `${SUMMARY_PREFIX}\n${text}`;
    } catch (error) {
      console.error('Context summary generation failed:', error);
      return null;
    }
  }

  private computeSummaryBudget(turns: Message[]): number {
    const contentTokens = estimateMessageTokens(turns);
    const budget = Math.floor(contentTokens * SUMMARY_RATIO);
    return Math.max(MIN_SUMMARY_TOKENS, Math.min(budget, this.maxSummaryTokens));
  }

  private serializeForSummary(turns: Message[]): string {
    const maxContent = 6000;
    const headChars = 4000;
    const tailChars = 1500;
    const parts: string[] = [];

    for (const msg of turns) {
      let text = getMessageText(msg);
      if (text.length > maxContent) {
        text =
          text.slice(0, headChars) +
          '\n...[truncated]...\n' +
          text.slice(-tailChars);
      }

      if (msg.role === 'toolResult') {
        parts.push(`[TOOL RESULT ${msg.toolCallId}]: ${text}`);
      } else if (msg.role === 'assistant') {
        const toolCalls = (msg as AssistantMessage).content.filter(
          (b): b is ToolCall => b.type === 'toolCall',
        );
        if (toolCalls.length > 0) {
          const tcText = toolCalls
            .map((tc) => `  ${tc.name}(${JSON.stringify(tc.arguments).slice(0, 1500)})`)
            .join('\n');
          text += `\n[Tool calls:\n${tcText}\n]`;
        }
        parts.push(`[ASSISTANT]: ${text}`);
      } else {
        parts.push(`[${msg.role.toUpperCase()}]: ${text}`);
      }
    }

    return parts.join('\n\n');
  }
}
