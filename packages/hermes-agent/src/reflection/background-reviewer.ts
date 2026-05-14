/**
 * BackgroundReviewer — spawns an independent thread to perform reflection review.
 *
 * Mirrors Python hermes-agent's _spawn_background_review() pattern:
 * - Operates on a snapshot of messages (no mutation of main session)
 * - Writes to shared memory/skill stores
 * - Never blocks the main conversation
 * - Reports results via callbacks
 * 
 * Now with full observability support:
 * - Creates independent TraceContext for each review
 * - Records reflection-specific metrics
 * - Spans for audit and skill generation phases
 */

import type { Message, Model, Api } from '@mariozechner/pi-ai';
import type {
  BackgroundReviewTrigger,
  BackgroundReviewSummary,
  ReflectionConfig,
} from '../types';
import type { AuditResult } from './types';
import { ReflectionAuditor, SkillGenerator, LearningRecorder } from './index';
import type { ObservabilityBus, TraceContext, Tracer, MetricsCollector } from '../observability';

/** Prompts for background review (mirrors Python hermes-agent) */
export const MEMORY_REVIEW_PROMPT = `Review the conversation above and consider saving to memory if appropriate.

Focus on:
1. Has the user revealed things about themselves — their persona, desires, preferences, or personal details worth remembering?
2. Has the user expressed expectations about how you should behave, their work style, or ways they want you to operate?

If something stands out, save it using the memory tool.
If nothing is worth saving, just say 'Nothing to save.' and stop.`;

export const SKILL_REVIEW_PROMPT = `Review the conversation above and consider saving or updating a skill if appropriate.

Focus on: was a non-trivial approach used to complete a task that required trial and error, or changing course due to experiential findings along the way, or did the user expect or desire a different method or outcome?

If a relevant skill already exists, update it with what you learned.
Otherwise, create a new skill if the approach is reusable.
If nothing is worth saving, just say 'Nothing to save.' and stop.`;

export const COMBINED_REVIEW_PROMPT = `Review the conversation above and consider two things:

**Memory**: Has the user revealed things about themselves — their persona, desires, preferences, or personal details? Has the user expressed expectations about how you should behave, their work style, or ways they want you to operate? If so, save using the memory tool.

**Skills**: Was a non-trivial approach used to complete a task that required trial and error, or changing course due to experiential findings along the way, or did the user expect or desire a different method or outcome? If a relevant skill already exists, update it. Otherwise, create a new one if the approach is reusable.

Only act if there's something genuinely worth saving.`;

/** Configuration for background review trigger conditions */
export interface BackgroundReviewTriggerConfig {
  /** Turn count interval for memory review (0 = disabled) */
  turnNudgeInterval: number;
  /** Iteration count threshold for skill review (0 = disabled) */
  iterationNudgeInterval: number;
  /** Maximum iterations for the review agent */
  maxReviewIterations: number;
}

/** State tracking for trigger conditions */
export interface BackgroundReviewState {
  turnsSinceMemory: number;
  iterationsSinceSkill: number;
  turnCount: number;
}

/**
 * BackgroundReviewer manages asynchronous reflection review in a separate thread.
 * Now with full observability support.
 */
export class BackgroundReviewer {
  private readonly config: ReflectionConfig;
  private readonly triggerConfig: BackgroundReviewTriggerConfig;
  private readonly state: BackgroundReviewState;
  private readonly onReviewStart?: (trigger: BackgroundReviewTrigger) => void;
  private readonly onReviewComplete?: (summary: BackgroundReviewSummary) => void;
  private observability?: ObservabilityBus;
  private tracer?: Tracer;
  private metrics?: MetricsCollector;

  constructor(
    config: ReflectionConfig,
    callbacks?: {
      onBackgroundReviewStart?: (trigger: BackgroundReviewTrigger) => void;
      onBackgroundReviewComplete?: (summary: BackgroundReviewSummary) => void;
    },
  ) {
    this.config = config;
    this.triggerConfig = {
      turnNudgeInterval: config.turnNudgeInterval ?? 10,
      iterationNudgeInterval: config.iterationNudgeInterval ?? 10,
      maxReviewIterations: config.maxReviewIterations ?? 8,
    };
    this.state = {
      turnsSinceMemory: 0,
      iterationsSinceSkill: 0,
      turnCount: 0,
    };
    this.onReviewStart = callbacks?.onBackgroundReviewStart;
    this.onReviewComplete = callbacks?.onBackgroundReviewComplete;
  }

  /**
   * Set observability components for tracking background review.
   */
  setObservability(bus: ObservabilityBus | undefined, tracer: Tracer | undefined, metrics: MetricsCollector | undefined): void {
    this.observability = bus;
    this.tracer = tracer;
    this.metrics = metrics;
  }

  /**
   * Called at the start of each user turn to track turn count.
   */
  onTurnStart(): void {
    this.state.turnCount++;
  }

  /**
   * Called after each tool iteration within a turn.
   */
  onToolIteration(): void {
    this.state.iterationsSinceSkill++;
  }

  /**
   * Check if any review triggers are met.
   * Returns the trigger type(s) or null if no trigger.
   */
  checkTriggers(): BackgroundReviewTrigger | null {
    const shouldReviewMemory =
      this.triggerConfig.turnNudgeInterval > 0 &&
      this.state.turnsSinceMemory >= this.triggerConfig.turnNudgeInterval;

    const shouldReviewSkills =
      this.triggerConfig.iterationNudgeInterval > 0 &&
      this.state.iterationsSinceSkill >= this.triggerConfig.iterationNudgeInterval;

    if (shouldReviewMemory && shouldReviewSkills) {
      return 'combined';
    }
    if (shouldReviewMemory) {
      return 'memory';
    }
    if (shouldReviewSkills) {
      return 'skills';
    }
    return null;
  }

  /**
   * Reset trigger counters after spawning a review.
   */
  resetTriggers(trigger: BackgroundReviewTrigger): void {
    if (trigger === 'memory' || trigger === 'combined') {
      this.state.turnsSinceMemory = 0;
    }
    if (trigger === 'skills' || trigger === 'combined') {
      this.state.iterationsSinceSkill = 0;
    }
  }

  /**
   * Spawn a background review thread with full observability tracking.
   *
   * @param messagesSnapshot - Copy of the conversation messages to review
   * @param model - The model to use for the review agent
   * @param finalResponse - The final response from the main agent turn
   * @param memoryManager - Optional memory manager for recording learnings
   */
  spawn(
    messagesSnapshot: Message[],
    model: Model<Api>,
    finalResponse: string,
    memoryManager?: import('../memory-manager').MemoryManager,
  ): void {
    const trigger = this.checkTriggers();
    if (!trigger) return;

    // Reset counters before spawning (non-blocking)
    this.resetTriggers(trigger);

    // Notify start
    this.onReviewStart?.(trigger);

    // Spawn background thread (Node.js worker_thread or setTimeout fallback)
    const startTime = Date.now();
    
    // Use setTimeout for simple async execution (avoids worker_thread complexity)
    // In production, this could be upgraded to worker_threads for true parallelism
    setTimeout(async () => {
      const summary: BackgroundReviewSummary = {
        trigger,
        success: false,
        durationMs: 0,
      };

      // Create a trace context for this background review
      const traceCtx: TraceContext = {
        traceId: `bg_review_${Date.now().toString(36)}`,
        agentName: 'background_reviewer',
        startTime,
      };

      // Start trace span for background review
      const bgSpan = this.tracer?.startSpan(traceCtx, 'background_review', 'internal', {
        trigger,
        messageCount: messagesSnapshot.length,
      });

      try {
        const result = await this.runReview(
          messagesSnapshot,
          model,
          trigger,
          finalResponse,
          memoryManager,
          traceCtx,
        );
        summary.success = true;
        summary.skillsCreated = result.skillsCreated;
        summary.memoryUpdated = result.memoryUpdated;

        // Record success metrics
        if (this.metrics) {
          this.metrics.record(traceCtx, 'reflection.skills.created', result.skillsCreated.length);
          if (result.memoryUpdated) {
            this.metrics.record(traceCtx, 'reflection.memory.updated', 1);
          }
          this.metrics.record(traceCtx, 'reflection.audit.latency', Date.now() - startTime);
        }

        // End span with success
        if (bgSpan && this.tracer) {
          this.tracer.endSpan(bgSpan, {
            status: 'ok',
            attributes: {
              trigger,
              skillsCreated: result.skillsCreated.length,
              memoryUpdated: result.memoryUpdated,
            },
          });
        }
      } catch (err) {
        summary.error = err instanceof Error ? err.message : String(err);
        
        // End span with error
        if (bgSpan && this.tracer) {
          this.tracer.endSpan(bgSpan, {
            status: 'error',
            attributes: {
              trigger,
              error: summary.error,
            },
          });
        }
      } finally {
        summary.durationMs = Date.now() - startTime;
        this.onReviewComplete?.(summary);
      }
    }, 0);
  }

  /**
   * Get the appropriate review prompt based on trigger type.
   */
  private getReviewPrompt(trigger: BackgroundReviewTrigger): string {
    switch (trigger) {
      case 'memory':
        return MEMORY_REVIEW_PROMPT;
      case 'skills':
        return SKILL_REVIEW_PROMPT;
      case 'combined':
        return COMBINED_REVIEW_PROMPT;
    }
  }

  /**
   * Execute the review in a synchronous context (called from background thread).
   * Now with observability tracking.
   */
  private async runReview(
    messagesSnapshot: Message[],
    model: Model<Api>,
    trigger: BackgroundReviewTrigger,
    finalResponse: string,
    memoryManager: import('../memory-manager').MemoryManager | undefined,
    traceCtx: TraceContext,
  ): Promise<{ skillsCreated: string[]; memoryUpdated: boolean }> {
    const skillsCreated: string[] = [];
    let memoryUpdated = false;

    // Extract user messages for audit
    const userMessages = messagesSnapshot
      .filter((m) => m.role === 'user')
      .map((m) => (typeof m.content === 'string' ? m.content : ''));

    // Run reflection audit if frameworks path is configured
    if (this.config.frameworksPath) {
      const auditSpan = this.tracer?.startSpan(traceCtx, 'background_review_audit', 'internal', {
        messageCount: userMessages.length,
      });

      const auditStart = Date.now();
      let auditResult: AuditResult | undefined;
      let auditor: ReflectionAuditor | undefined;

      try {
        auditor = new ReflectionAuditor(this.config.frameworksPath);
        auditResult = await auditor.audit(
          model,
          userMessages,
          finalResponse,
          this.config.maxTokens ?? 2000,
        );

        // Record audit metrics
        if (this.metrics) {
          this.metrics.record(traceCtx, 'reflection.dimensions.checked', auditResult.dimensions.length);
          this.metrics.record(traceCtx, 'reflection.dimensions.covered', auditResult.covered.length);
          this.metrics.record(traceCtx, 'reflection.dimensions.missing', auditResult.missing.length);
          this.metrics.record(traceCtx, 'reflection.audit.latency', Date.now() - auditStart);
          if (auditResult.rawResponse) {
            // Estimate tokens from raw response length (rough estimate)
            const estTokens = Math.ceil(auditResult.rawResponse.length / 4);
            this.metrics.record(traceCtx, 'reflection.audit.tokens', estTokens);
          }
        }

        // End audit span
        if (auditSpan && this.tracer) {
          this.tracer.endSpan(auditSpan, {
            status: 'ok',
            attributes: {
              dimensionsChecked: auditResult.dimensions.length,
              dimensionsCovered: auditResult.covered.length,
              dimensionsMissing: auditResult.missing.length,
              domainRelevant: auditResult.domainRelevant,
            },
          });
        }
      } catch (err) {
        // End audit span with error
        if (auditSpan && this.tracer) {
          this.tracer.endSpan(auditSpan, {
            status: 'error',
            attributes: {
              error: err instanceof Error ? err.message : String(err),
            },
          });
        }
        throw err;
      }

      // Skill generation phase
      if (this.config.localSkillsDir && auditResult.missing.length > 0) {
        const skillSpan = this.tracer?.startSpan(traceCtx, 'background_review_skill_gen', 'internal', {
          missingDimensions: auditResult.missing.length,
        });

        try {
          const skillGen = new SkillGenerator(
            this.config.localSkillsDir,
            this.config.onSkillChanged,
          );

          const limit = Math.min(auditResult.missing.length, 3); // Cap at 3 per turn
          for (let i = 0; i < limit; i++) {
            const dim = auditResult.missing[i];
            const slug = skillGen.create(dim, dim.evidence);
            if (slug) skillsCreated.push(slug);
          }

          // End skill gen span
          if (skillSpan && this.tracer) {
            this.tracer.endSpan(skillSpan, {
              status: 'ok',
              attributes: {
                skillsCreated: skillsCreated.length,
              },
            });
          }
        } catch (err) {
          if (skillSpan && this.tracer) {
            this.tracer.endSpan(skillSpan, {
              status: 'error',
              attributes: {
                error: err instanceof Error ? err.message : String(err),
              },
            });
          }
          // Don't throw - skill gen errors shouldn't fail the whole review
        }
      }

      // Record learnings to memory
      if (memoryManager && auditResult.domainRelevant && auditor) {
        const recorder = new LearningRecorder(this.state.turnCount);
        const framework = await auditor.loadFramework();
        recorder.buildRecord(
          framework?.name ?? 'unknown',
          auditResult,
          skillsCreated,
        );
        memoryUpdated = true;
      }
    }

    // Log the trigger type for debugging (used to avoid unused variable warning)
    console.debug(`[BackgroundReviewer] Review completed for trigger: ${trigger}`);

    return { skillsCreated, memoryUpdated };
  }

  /**
   * Increment turn counter (called after turn completes).
   */
  incrementTurn(): void {
    this.state.turnsSinceMemory++;
  }
}
