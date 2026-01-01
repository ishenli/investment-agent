import { UIMessage } from 'ai';
import { AIMessage, HumanMessage } from 'langchain';
import { NextRequest, NextResponse } from 'next/server';
import logger from '@server/base/logger';
import { AuthService } from '@server/service/authService';
import { SSEEmitter } from '@server/base/sseEmitter';
import { createSSEResponse } from '@server/base/responseUtil';
import chatService from '@server/service/chatService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = (body.messages ?? [])
      .filter((message: UIMessage) => message.role === 'user' || message.role === 'assistant')
      .map((message: UIMessage) => {
        return message.role == 'user'
          ? new HumanMessage(
              message.parts.map((part) => (part.type === 'text' ? part.text : '')).join(''),
            )
          : new AIMessage(
              message.parts.map((part) => (part.type === 'text' ? part.text : '')).join(''),
            );
      });

    // 从最后一条用户消息中提取查询内容
    const lastUserMessage = messages?.filter((m: HumanMessage) => m.type === 'human').pop();
    const userQuery = lastUserMessage.content || '用户意图为空';
    const sseEmitter = new SSEEmitter();
    
    // 获取当前用户ID
    const accountId = (await AuthService.getCurrentUserId());
    
    // 调用 chatService 处理投资顾问聊天请求
    (async () => {
      try {
        sseEmitter.sendAISdkStart();
        await chatService.chat({
          query: userQuery,
          agentId: 'investment_advisor',
          model: body.model,
          accountId: accountId,
        }, sseEmitter);
      } catch (error) {
        logger.error('[ChatController] 获取投资咨询数据失败:', error);
        sseEmitter.sendAISdkMessage({
          type: 'error',
          errorText: error instanceof Error ? error.message : '获取投资咨询数据失败',
        });
      } finally {
        sseEmitter.sendAISdkEnd();
        sseEmitter.close();
      }
    })();

    return createSSEResponse(sseEmitter.readable);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
