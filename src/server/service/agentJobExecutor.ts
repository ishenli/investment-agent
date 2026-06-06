/**
 * Agent Job Executor
 *
 * 执行 agent 类型的定时任务：读取用户自然语言指令，
 * 使用 HermesEngine（headless）携带业务工具执行，
 * 将结果通过通知系统发送给用户。
 */
import logger from '@server/base/logger';
import { NoOpEventSink } from '@server/core/engine/eventSink';
import { HermesEngine } from '@server/core/agents/hermes/engine';
import type { ScheduledJobEntity } from '@server/repository/scheduledJobRepository';
import type { JobExecutionResult } from '@/types/scheduledJob';

const AGENT_JOB_SYSTEM_PROMPT = `你是一个投资助理 Agent，正在执行用户预设的定时任务。

规则：
- 根据用户的任务描述，使用可用的工具完成任务
- 执行完毕后，用简洁的中文总结执行结果
- 如果任务需要查询数据，先查询再分析
- 如果任务涉及条件判断（如价格阈值），明确说明是否满足条件
- 不要编造数据，如果工具调用失败，如实报告`;

export async function executeAgentJob(
  job: ScheduledJobEntity,
): Promise<JobExecutionResult> {
  const notificationService = (await import('@server/service/notificationService')).default;

  const config = job.config as Record<string, unknown> | null;
  const prompt = (config?.instructions as string) || (config?.prompt as string);

  if (!prompt) {
    throw new Error('Agent 任务缺少指令描述（config.instructions）');
  }

  const accountContext = job.accountId
    ? `\n当前操作的账户 ID 为 ${job.accountId}。`
    : '';

  const systemPrompt = AGENT_JOB_SYSTEM_PROMPT + accountContext;

  const engine = new HermesEngine();
  const eventSink = new NoOpEventSink();

  const ctx = {
    sessionId: `scheduled-job-${job.id}`,
    userId: job.userId,
    messageId: `agent-job-${job.id}-${Date.now()}`,
    model: 'default',
    provider: 'openai',
    messages: [
      { role: 'user' as const, content: prompt },
    ],
    systemPrompt,
    signal: AbortSignal.timeout(job.timeoutMs || 300000),
    extra: {
      enableTools: true,
      maxIterations: 15,
      name: `scheduled-agent-${job.id}`,
      platform: 'web',
    },
  };

  logger.info(`[AgentJobExecutor] Starting job ${job.id} "${job.name}" with prompt: ${prompt.slice(0, 100)}...`);

  const result = await engine.run(ctx, eventSink);

  if (!result.completed) {
    throw new Error(result.error || 'Agent 执行未完成');
  }

  const summary = result.content.length > 200
    ? result.content.slice(0, 200) + '...'
    : result.content;

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
