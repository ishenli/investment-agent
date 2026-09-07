/**
 * Agent Job Executor
 *
 * 执行 agent 与 insight 类型的定时任务：
 * - agent 类型：读取用户自然语言指令，使用 HermesEngine（headless）携带业务工具执行，
 *   将结果通过通知系统发送给用户。
 * - insight 类型：读取 config.instructions 作为该轮提示词，通过 HermesEngine（headless）执行，
 *   每次执行创建一个全新的持久化会话（chatSessions），并把用户指令与产出落为该会话的消息，
 *   供用户在洞察历史中回看完整对话上下文。
 */
import logger from '@server/base/logger';
import { NoOpEventSink } from '@server/core/engine/eventSink';
import { HermesEngine } from '@server/core/agents/hermes/engine';
import { sessionRepository } from '@server/repository/chat';
import { nanoid } from 'nanoid';
import type { EngineRunContext, EngineRunResult } from '@server/core/engine/types';
import type { ScheduledJobEntity } from '@server/repository/scheduledJobRepository';
import type { JobExecutionResult } from '@/types/scheduledJob';
import { SCHEDULED_INSIGHT_SLUG_PREFIX } from '@/types/aiInsight';

const AGENT_JOB_SYSTEM_PROMPT = `你是一个投资助理 Agent，正在执行用户预设的定时任务。

规则：
- 根据用户的任务描述，使用可用的工具完成任务
- 执行完毕后，用简洁的中文总结执行结果
- 如果任务需要查询数据，先查询再分析
- 如果任务涉及条件判断（如价格阈值），明确说明是否满足条件
- 不要编造数据，如果工具调用失败，如实报告`;

const SESSION_CONFIG = {
  model: 'default',
  provider: 'openai',
  params: {},
  systemRole: '',
};

/** 会话式洞察执行的历史保留上限，超出后裁剪最旧的洞察会话 */
const INSIGHT_SESSION_RETAIN_LIMIT = 30;

// ============== Helpers ==============

/**
 * 运行 HermesEngine（headless），校验执行完成。
 */
async function runEngine(ctx: EngineRunContext): Promise<EngineRunResult> {
  const engine = new HermesEngine();
  const eventSink = new NoOpEventSink();

  const result = await engine.run(ctx, eventSink);

  if (!result.completed) {
    throw new Error(result.error || 'Agent 执行未完成');
  }

  return result;
}

/**
 * 基于任务构建系统提示词，附带账户上下文（若配置了 accountId）。
 */
function buildSystemPrompt(job: ScheduledJobEntity): string {
  const accountContext = job.accountId
    ? `\n当前操作的账户 ID 为 ${job.accountId}。`
    : '';

  return AGENT_JOB_SYSTEM_PROMPT + accountContext;
}

/**
 * 截断过长的产出用于通知摘要。
 */
function toSummary(content: string): string {
  return content.length > 200 ? content.slice(0, 200) + '...' : content;
}

/**
 * 格式化为 YYYY-MM-DD。
 */
function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ============== Agent Job ==============

export async function executeAgentJob(
  job: ScheduledJobEntity,
): Promise<JobExecutionResult> {
  const notificationService = (await import('@server/service/notificationService')).default;

  const config = job.config as Record<string, unknown> | null;
  const prompt = (config?.instructions as string) || (config?.prompt as string);

  if (!prompt) {
    throw new Error('Agent 任务缺少指令描述（config.instructions）');
  }

  const timeStarted = Date.now();

  const ctx: EngineRunContext = {
    sessionId: `scheduled-job-${job.id}`,
    userId: job.userId,
    messageId: `agent-job-${job.id}-${timeStarted}`,
    model: 'default',
    provider: 'openai',
    messages: [
      { role: 'user' as const, content: prompt },
    ],
    systemPrompt: buildSystemPrompt(job),
    signal: AbortSignal.timeout(job.timeoutMs || 300000),
    extra: {
      enableTools: true,
      maxIterations: 15,
      name: `scheduled-agent-${job.id}`,
      platform: 'web',
    },
  };

  logger.info(`[AgentJobExecutor] Starting job ${job.id} "${job.name}" with prompt: ${prompt.slice(0, 100)}...`);

  const result = await runEngine(ctx);

  const summary = toSummary(result.content);

  await notificationService.createNotification(job.userId, {
    type: 'analysis_completed',
    title: `${job.name}已完成`,
    message: summary || '任务执行完成',
    link: '/setting/scheduled-jobs',
    priority: 'medium',
    data: {
      jobId: job.id,
      fullContent: result.content,
      usage: result.usage,
    },
  });

  logger.info(`[AgentJobExecutor] Job ${job.id} completed. Content length: ${result.content.length}`);

  return {
    success: true,
    message: summary || '任务执行完成',
  };
}

// ============== Insight Job (会话式) ==============

/**
 * 会话式洞察执行
 *
 * 每次触发创建一个全新的持久化会话，将 config.instructions 作为该轮用户提示词，
 * 经 HermesEngine（headless）执行后，用户指令与产出作为同会话的消息落库，
 * 并在 scheduledJobLogs.result 中记录 sessionId 与产出消息 id。
 */
export async function executeInsightAgentJob(
  job: ScheduledJobEntity,
): Promise<JobExecutionResult> {
  const chatStorageService = (await import('@server/service/chatStorageService')).chatStorageService;
  const notificationService = (await import('@server/service/notificationService')).default;

  const config = job.config as Record<string, unknown> | null;
  const instructions = (config?.instructions as string) || '';

  if (!instructions.trim()) {
    throw new Error('洞察任务缺少指令描述（config.instructions）');
  }

  let sessionId: string | undefined;

  try {
    // 1. 为本次执行创建全新会话（slug 用 nanoid，避免并发/重试触发毫秒级冲突）
    const slug = `${SCHEDULED_INSIGHT_SLUG_PREFIX}${job.id}-${nanoid()}`;
    sessionId = await chatStorageService.createSession(job.userId, {
      slug,
      type: 'agent',
      config: SESSION_CONFIG,
      meta: {
        title: `${job.name} · ${formatDate(new Date())}`,
      },
    });

    logger.info(`[AgentJobExecutor] Created insight session ${sessionId} for job ${job.id}`);

    // 会话式执行长期运行会不断累积会话，这里仅保留最近 N 条（best-effort，裁剪失败不影响执行）
    try {
      const pruned = await sessionRepository.deleteScheduledInsightSessionsBeyond(
        job.userId,
        INSIGHT_SESSION_RETAIN_LIMIT,
      );
      if (pruned > 0) {
        logger.info(`[AgentJobExecutor] Pruned ${pruned} old insight sessions for user ${job.userId}`);
      }
    } catch (pruneError) {
      logger.warn(`[AgentJobExecutor] Failed to prune old insight sessions for user ${job.userId}: ${pruneError}`);
    }

    // 2. 将用户指令写为该会话的用户消息，保证上下文完整可回溯
    const userMessageId = await chatStorageService.createMessage({
      sessionId,
      role: 'user',
      content: instructions,
    });

    // 3. HermesEngine（headless）执行，携带任务 userId 与 accountId，不依赖前端 session
    const ctx: EngineRunContext = {
      sessionId,
      userId: job.userId,
      messageId: `insight-job-${job.id}-${nanoid()}`,
      model: 'default',
      provider: 'openai',
      messages: [
        { role: 'user' as const, content: instructions },
      ],
      systemPrompt: buildSystemPrompt(job),
      signal: AbortSignal.timeout(job.timeoutMs || 300000),
      extra: {
        enableTools: true,
        maxIterations: 15,
        name: `scheduled-insight-${job.id}`,
        platform: 'web',
      },
    };

    logger.info(`[AgentJobExecutor] Starting insight job ${job.id} "${job.name}" with instructions: ${instructions.slice(0, 100)}...`);

    const result = await runEngine(ctx);

    // 4. 将产出写为该会话的助手消息
    const assistantMessageId = await chatStorageService.createMessage({
      sessionId,
      role: 'assistant',
      content: result.content,
    });

    const summary = toSummary(result.content);

    // 5. 通知指向该次洞察会话
    await notificationService.createNotification(job.userId, {
      type: 'analysis_completed',
      title: `${job.name}已完成`,
      message: summary || '任务执行完成',
      link: `/chat?session=${sessionId}`,
      priority: 'medium',
      data: {
        jobId: job.id,
        sessionId,
        userMessageId,
        insightMessageId: assistantMessageId,
        fullContent: result.content,
        usage: result.usage,
      },
    });

    logger.info(`[AgentJobExecutor] Insight job ${job.id} completed. Session ${sessionId}, content length: ${result.content.length}`);

    return {
      success: true,
      sessionId,
      insightMessageId: assistantMessageId,
      message: summary || '任务执行完成',
    };
  } catch (error) {
    // 执行失败不残留空会话：删除本次新建会话（chatMessages 由外键级联删除）
    if (sessionId) {
      await chatStorageService.deleteSession(sessionId).catch((cleanupError) => {
        logger.warn(`[AgentJobExecutor] Failed to clean up insight session ${sessionId} after job failure: ${cleanupError}`);
      });
    }
    throw error;
  }
}
