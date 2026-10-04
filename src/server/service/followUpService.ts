import path from 'path';
import { ReflectionAuditor } from '@investment-agent/hermes-agent';
import { resolveAgentModel } from './agentModelResolver';
import { getProjectDir } from '@server/base/env';
import logger from '@server/base/logger';

/** 每条 assistant 消息最多生成的追问条数 */
export const FOLLOW_UP_MAX_ITEMS = 3;

/**
 * FollowUpService
 *
 * 为完成的 assistant 回复生成 ≤3 条投资域相关追问（驱动 ChatUI 的"可以接着问"）。
 * 领域判定与 LLM 生成委托给 hermes-agent 的 ReflectionAuditor；任何失败/域外都返回空数组。
 */
export class FollowUpService {
  /**
   * 生成最长 FOLLOW_UP_MAX_ITEMS 条追问
   * @param userId 账户/用户 ID（用于解析模型配置）
   * @param provider pi-ai provider 名（如 openai）
   * @param model 模型 slug（如 gpt-4o）
   * @param messages 用户历史消息纯文本
   * @param finalReply 助手最终回答
   * @returns 追问数组；域外或生成失败时为空数组
   */
  async generateFollowUpQuestions(input: {
    userId: number;
    provider: string;
    model: string;
    messages: string[];
    finalReply: string;
  }): Promise<string[]> {
    const { userId, provider, model, messages, finalReply } = input;
    try {
      const auditor = new ReflectionAuditor(
        path.join(
          getProjectDir(),
          'packages/hermes-agent/src/reflection/frameworks/investment-analysis.json',
        ),
      );
      if (!(await auditor.isDomainRelevant([...messages, finalReply]))) return [];

      const { model: piModel, apiKey } = await resolveAgentModel(userId, provider, model);
      const items = await auditor.generateFollowUpQuestions(piModel, messages, finalReply, {
        apiKey,
        maxTokens: 800,
      });
      const capped = items.slice(0, FOLLOW_UP_MAX_ITEMS);
      logger.info(
        `[FollowUpService] Generated ${capped.length} follow-up question(s) for user=${userId} provider=${provider} model=${model}`,
      );
      return capped;
    } catch (error) {
      logger.warn(`[FollowUpService] Follow-up generation failed: ${error}`);
      return [];
    }
  }
}

const followUpService = new FollowUpService();
export default followUpService;
