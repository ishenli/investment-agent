/**
 * Hermes Agent Chat API Route
 *
 * 使用 @investment-agent/hermes-agent 包处理聊天请求
 * 支持 pi-ai 多 Provider（OpenAI、Anthropic、Google 等）
 * 通过 SSE 流式输出 AgentStreamEvent
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { INVESTMENT_ASSISTANT_SYSTEM_PROMPT } from '@server/core/agents/hermes';
import { runEngine } from '@server/core/engine';
import { BaseController } from '../../base/baseController';
import { WithRequestContextStatic } from '@server/base/decorators';
import { SSEEmitter } from '@server/base/sseEmitter';
import { createSSEResponse } from '@server/base/responseUtil';
import { chatStorageService } from '@server/service/chatStorageService';
import { sessionRepository } from '@server/repository/chat/session';
import authService from '@server/service/authService';
import logger from '@server/base/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============== Request Schema ==============

const HermesChatRequestSchema = z.object({
  sessionId: z.string(),
  topicId: z.string().optional(),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    }),
  ),
  /** pi-ai provider name (e.g. 'openai', 'anthropic', 'google') */
  provider: z.string().default('openai'),
  /** Model ID within the provider */
  model: z.string().default('gpt-4o'),
  /** Custom system prompt */
  systemPrompt: z.string().optional(),
  /** Enable built-in tools (default: true) */
  enableTools: z.boolean().optional().default(true),
  /** Max tool-calling iterations */
  maxIterations: z.number().optional().default(30),
});

type HermesChatRequest = z.infer<typeof HermesChatRequestSchema>;

// ============== Controller ==============

class HermesAgentController extends BaseController {
  @WithRequestContextStatic()
  static async POST(request: NextRequest) {
    try {
      // 1. 参数验证
      const body = await this.validateBody(request, HermesChatRequestSchema);

      // 2. 提取最后一条用户消息
      const userMessage = body.messages.findLast((msg) => msg.role === 'user');
      if (!userMessage) {
        return this.error('未找到用户消息', 'no_user_message');
      }

      // 3. 用户认证
      const userId = await authService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 4. 创建 SSE Emitter
      const sseEmitter = new SSEEmitter();
      const messageId = `msg_${crypto.randomUUID()}`;
      const sessionId = HermesAgentController.resolveSessionId(body.sessionId);
      const userIdNum = Number(userId);

      // 5. AbortController - propagated to agent
      const abortController = new AbortController();
      request.signal.addEventListener('abort', () => {
        abortController.abort();
      });

      // Persist user message before engine run
      try {
        const existingSession = await sessionRepository.findById(sessionId);
        if (existingSession) {
          await chatStorageService.createMessage({
            sessionId,
            role: 'user',
            content: userMessage.content,
          });
        }
      } catch (error) {
        logger.error(`[HermesAgentController] Failed to persist user message: ${error}`);
      }

      // 6. 后台异步执行 Agent
      (async () => {
        try {
          const result = await runEngine(
            'hermes',
            {
              sessionId,
              topicId: body.topicId,
              userId: userIdNum,
              messageId,
              model: body.model,
              provider: body.provider,
              messages: body.messages,
              systemPrompt: body.systemPrompt ?? INVESTMENT_ASSISTANT_SYSTEM_PROMPT,
              signal: abortController.signal,
              extra: {
                enableTools: body.enableTools,
                maxIterations: body.maxIterations,
              },
            },
            sseEmitter,
          );

          if (!result.completed && result.error) {
            await sseEmitter.sendAgentError(result.error, 'agent_incomplete');
          }

          // Persist assistant response
          if (result.content) {
            try {
              const sessionExists = await sessionRepository.findById(sessionId);
              if (sessionExists) {
                await chatStorageService.createMessage({
                  sessionId,
                  role: 'assistant',
                  content: result.content,
                  fromModel: body.model,
                  fromProvider: body.provider,
                });
              }
            } catch (error) {
              logger.error(`[HermesAgentController] Failed to persist assistant message: ${error}`);
            }
          }
        } catch (error) {
          if (abortController.signal.aborted) return; // Client disconnected, stop silently
          logger.error('[HermesAgentController] Stream error:', error);
          await sseEmitter.sendAgentError(
            error instanceof Error ? error.message : 'Unknown error',
            'hermes_error',
          );
        } finally {
          await sseEmitter.sendDone();
          await sseEmitter.close();
        }
      })();

      return createSSEResponse(sseEmitter.readable);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }
      logger.error('[HermesAgentController] Error:', error);
      return this.error('处理 Hermes 聊天请求时发生错误', 'hermes_chat_error');
    }
  }
}

export const POST = HermesAgentController.POST;
