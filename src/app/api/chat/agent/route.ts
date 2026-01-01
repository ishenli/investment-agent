import { AIMessage, HumanMessage, SystemMessage } from 'langchain';
import logger from '@server/base/logger';
import { AuthService } from '@server/service/authService';
import { SSEEmitter } from '@server/base/sseEmitter';
import { createSSEResponse } from '@server/base/responseUtil';
import { WithRequestContextStatic } from '@server/base/decorators';
import { BaseController } from '../../base/baseController';
import { z } from 'zod';
import chatService, { GraphType } from '@server/service/chatService';
import { ModelNameType } from '@/server/core/provider/chatModel';

// 定义请求体的 Zod 验证模式
const ChatAgentRequestSchema = z.object({
  agentId: z.string().optional(),
  messages: z.array(
    z.object({
      id: z.string().optional(),
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
      createdAt: z.number().optional(),
    }),
  ),
  model: z.string().optional().default('Qwen3-Next-80B-A3B-Instruct'),
});


class InvestmentAgentController extends BaseController {
  @WithRequestContextStatic()
  static async POST(request: Request) {
    try {
      const body = await this.validateBody(request, ChatAgentRequestSchema);

      const messages = (body.messages ?? [])
        .filter((message) => message.role === 'user' || message.role === 'assistant' || message.role === 'system')
        .map((message) => {
          if (message.role === 'assistant') {
            return new AIMessage(message.content);
          } else if (message.role === 'system') {
            return new SystemMessage(message.content);
          }
          return new HumanMessage(message.content);

        });

      // 从最后一条用户消息中提取查询内容
      const lastUserMessage = messages?.filter((m) => m._getType() === 'human').pop();
      const userQuery = (typeof lastUserMessage?.content === 'string' ? lastUserMessage.content : '') || '用户意图为空';
      const sseEmitter = new SSEEmitter();
      
      // 获取当前用户ID
      const accountInfo = await AuthService.getCurrentUserAccount();
      if (!accountInfo) {
        return this.error('用户未登录', 'unauthorized');
      }

      const accountId = accountInfo.id;
      const agentId = body.agentId || 'investment_advisor';
      // 调用 chatService 处理投资顾问聊天请求
      (async () => {
        try {
          await chatService.chat({
            messages: messages,
            query: userQuery,
            agentId: agentId as GraphType,
            model: body.model as ModelNameType,
            accountId: accountId,
          }, sseEmitter);
        } catch (error) {
          logger.error('[InvestmentAgentController] 获取投资咨询数据失败:', error);
          sseEmitter.sendError(error instanceof Error ? error.message : '获取投资咨询数据失败');
        } finally {
          sseEmitter.close();
        }
      })();

      return createSSEResponse(sseEmitter.readable);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }

      logger.error('Error in investment advisor action', { error });
      return this.error('处理投资咨询请求时发生错误', 'investment_advisor_error');
    }
  }
}

export const POST = InvestmentAgentController.POST;
