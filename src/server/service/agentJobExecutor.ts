/**
 * Agent Job Executor
 *
 * 执行 agent 与 insight 类型的定时任务：
 * - agent 类型：读取用户自然语言指令，使用 HermesEngine（headless）携带业务工具执行，
 *   将结果通过通知系统发送给用户。
 * - insight 类型：读取 config.instructions 作为该轮提示词，通过 HermesEngine（headless）执行，
 *   每次执行在「每日洞察」专属 Agent 的常驻会话下新建一个 topic，用户指令与产出落为该 topic
 *   的消息，供用户在 Agent 会话与洞察历史中回看。
 */
import logger from '@server/base/logger';
import { NoOpEventSink } from '@server/core/engine/eventSink';
import { HermesEngine } from '@server/core/agents/hermes/engine';
import { topicRepository } from '@server/repository/chat';
import { agentRepository } from '@server/repository/agentRepository';
import { AI_INSIGHT_AGENT_SLUG } from '@/shared/config/builtinAgents';
import { nanoid } from 'nanoid';
import type { EngineRunContext, EngineRunResult } from '@server/core/engine/types';
import type { ScheduledJobEntity } from '@server/repository/scheduledJobRepository';
import type { JobExecutionResult } from '@/types/scheduledJob';

const AGENT_JOB_SYSTEM_PROMPT = `你是一个投资助理 Agent，正在执行用户预设的定时任务。

规则：
- 根据用户的任务描述，使用可用的工具完成任务
- 执行完毕后，用简洁的中文总结执行结果
- 如果任务需要查询数据，先查询再分析
- 如果任务涉及条件判断（如价格阈值），明确说明是否满足条件
- 不要编造数据，如果工具调用失败，如实报告`;

/** 常驻会话下洞察 topic 的历史保留上限，超出后裁剪最旧的 topic */
const INSIGHT_TOPIC_RETAIN_LIMIT = 30;

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
function buildSystemPrompt(job: ScheduledJobEntity, basePrompt?: string): string {
  const accountContext = job.accountId
    ? `\n当前操作的账户 ID 为 ${job.accountId}。`
    : '';

  return (basePrompt || AGENT_JOB_SYSTEM_PROMPT) + accountContext;
}

/**
 * 获取每日洞察专属 Agent 的系统提示词（Agent 未初始化时返回 undefined 走兜底）。
 */
async function getInsightAgentSystemRole(): Promise<string | undefined> {
  try {
    const insightAgent = await agentRepository.findBySlug(AI_INSIGHT_AGENT_SLUG);
    return insightAgent?.systemRole || undefined;
  } catch (error) {
    logger.warn(`[AgentJobExecutor] Failed to load insight agent "${AI_INSIGHT_AGENT_SLUG}", fallback to default prompt: ${error}`);
    return undefined;
  }
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

// ============== Insight Job (会话式，落 Agent 常驻会话的 topic) ==============

/**
 * 会话式洞察执行
 *
 * 每次触发由专属内置 Agent（ai_insight）的常驻会话承载：
 * 会话绑定 agentId，执行使用该 Agent 的 systemRole 作为人设；
 * 每次执行在常驻会话下新建一个 topic（标题 = 任务名 · 执行日期），
 * config.instructions 与产出分别落为该 topic 的用户/助手消息，
 * 并在 scheduledJobLogs.result 中记录 sessionId、topicId 与产出消息 id。
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

  let topicId: string | undefined;

  try {
    // 1. 解析每日洞察专属 Agent（systemRole 未初始化时兜底默认提示词）
    const insightSystemRole = await getInsightAgentSystemRole();

    // 2. 获取或创建「每日洞察」Agent 的常驻会话（绑定 agentId，助手列表常驻入口）
    const session = await chatStorageService.getOrCreateBuiltinAgentSession(
      job.userId,
      AI_INSIGHT_AGENT_SLUG,
    );
    const sessionId = session.id;

    logger.info(`[AgentJobExecutor] Insight job ${job.id} runs in agent session ${sessionId}`);

    // 3. 本次执行新建一个 topic（每次运行独立成话题，可在 Agent 会话内逐条回看）
    topicId = await chatStorageService.createTopic({
      sessionId,
      title: `${job.name} · ${formatDate(new Date())}`,
    });

    // 常驻会话长期运行会不断累积 topic，这里仅保留最近 N 个（best-effort，裁剪失败不影响执行）
    try {
      const pruned = await topicRepository.deleteBeyondBySessionId(
        sessionId,
        INSIGHT_TOPIC_RETAIN_LIMIT,
      );
      if (pruned > 0) {
        logger.info(`[AgentJobExecutor] Pruned ${pruned} old insight topics for session ${sessionId}`);
      }
    } catch (pruneError) {
      logger.warn(`[AgentJobExecutor] Failed to prune old insight topics for session ${sessionId}: ${pruneError}`);
    }

    // 4. 将用户指令写为该 topic 的用户消息，保证上下文完整可回溯
    const userMessageId = await chatStorageService.createMessage({
      sessionId,
      topicId,
      role: 'user',
      content: instructions,
    });

    // 5. HermesEngine（headless）执行，携带任务 userId 与 accountId，不依赖前端 session
    const ctx: EngineRunContext = {
      sessionId,
      userId: job.userId,
      messageId: `insight-job-${job.id}-${nanoid()}`,
      model: 'default',
      provider: 'openai',
      messages: [
        { role: 'user' as const, content: instructions },
      ],
      systemPrompt: buildSystemPrompt(job, insightSystemRole),
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

    // 6. 将产出写为该 topic 的助手消息
    const assistantMessageId = await chatStorageService.createMessage({
      sessionId,
      topicId,
      role: 'assistant',
      content: result.content,
    });

    const summary = toSummary(result.content);

    // 7. 通知指向该次洞察所在的 Agent 会话
    await notificationService.createNotification(job.userId, {
      type: 'analysis_completed',
      title: `${job.name}已完成`,
      message: summary || '任务执行完成',
      link: `/chat?session=${sessionId}&topic=${topicId}`,
      priority: 'medium',
      data: {
        jobId: job.id,
        sessionId,
        topicId,
        userMessageId,
        insightMessageId: assistantMessageId,
        fullContent: result.content,
        usage: result.usage,
      },
    });

    logger.info(`[AgentJobExecutor] Insight job ${job.id} completed. Session ${sessionId}, topic ${topicId}, content length: ${result.content.length}`);

    return {
      success: true,
      sessionId,
      topicId,
      insightMessageId: assistantMessageId,
      message: summary || '任务执行完成',
    };
  } catch (error) {
    // 执行失败不残留空 topic：删除本次新建 topic（chatMessages 由外键级联删除），常驻会话保留
    if (topicId) {
      await chatStorageService.deleteTopic(topicId).catch((cleanupError) => {
        logger.warn(`[AgentJobExecutor] Failed to clean up insight topic ${topicId} after job failure: ${cleanupError}`);
      });
    }
    throw error;
  }
}
