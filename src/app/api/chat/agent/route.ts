/**
 * DeepAgents Chat API Route
 *
 * Routes `investment_advisor` requests through the unified `runEngine()`
 * pipeline.  Mirrors the structure used by `claude/route.ts` and
 * `hermes/route.ts`.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { runEngine } from '@server/core/engine';
import { BaseController } from '../../base/baseController';
import { WithRequestContextStatic } from '@server/base/decorators';
import { SSEEmitter } from '@server/base/sseEmitter';
import { createSSEResponse } from '@server/base/responseUtil';
import authService from '@server/service/authService';
import { chatStorageService } from '@server/service/chatStorageService';
import { sessionRepository } from '@server/repository/chat/session';
import logger from '@server/base/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============== Request Schema ==============

const AgentChatRequestSchema = z.object({
  sessionId: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    }),
  ),
  model: z.string(),
  agentId: z.string().optional(),
});

// ============== Controller ==============

class AgentChatController extends BaseController {
  @WithRequestContextStatic()
  static async POST(request: NextRequest) {
    try {
      // 1. 参数验证
      const body = await this.validateBody(request, AgentChatRequestSchema);

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

      // 4. 创建 SSE Emitter & AbortController
      const sseEmitter = new SSEEmitter();
      const messageId = `msg_${crypto.randomUUID()}`;
      const sessionId = this.resolveSessionId(body.sessionId);
      const userIdNum = Number(userId);

      const abortController = new AbortController();
      request.signal.addEventListener('abort', () => {
        abortController.abort();
      });

      // 5. 持久化用户消息
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
        logger.error(`[AgentChatController] Failed to persist user message: ${error}`);
      }

      // 6. 后台异步执行引擎
      (async () => {
        try {
          const result = await runEngine(
            'deepagents',
            {
              sessionId,
              userId: userIdNum,
              messageId,
              model: body.model,
              messages: body.messages,
              signal: abortController.signal,
              extra: {
                accountId: String(userIdNum),
              },
            },
            sseEmitter,
          );

          if (!result.completed && result.error) {
            await sseEmitter.sendAgentError(result.error, 'agent_incomplete');
          }

          // 持久化助手回复
          if (result.content) {
            try {
              const sessionExists = await sessionRepository.findById(sessionId);
              if (sessionExists) {
                await chatStorageService.createMessage({
                  sessionId,
                  role: 'assistant',
                  content: result.content,
                  fromModel: body.model,
                });
              }
            } catch (error) {
              logger.error(`[AgentChatController] Failed to persist assistant message: ${error}`);
            }
          }
        } catch (error) {
          if (abortController.signal.aborted) return; // Client disconnected, stop silently
          logger.error('[AgentChatController] Engine error:', error);
          await sseEmitter.sendAgentError(
            error instanceof Error ? error.message : 'Unknown error',
            'deepagents_error',
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

      logger.error('[AgentChatController] Error processing request:', error);
      return this.error('处理 Agent 请求时发生错误', 'agent_chat_error');
    }
  }
}

export const POST = AgentChatController.POST;
