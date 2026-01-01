import { WithRequestContextStatic } from '@server/base/decorators';
import { BaseController } from '@renderer/api/base/baseController';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { chatModelOpenAI } from '@server/core/provider/chatModel';
import logger from '@server/base/logger';

class LLMChatController extends BaseController {
  @WithRequestContextStatic()
  static async POST(request: Request) {
    try {
      // 解析请求体
      const body = await request.json();
      const { messages, model } = body;

      // 验证输入
      if (!messages || !Array.isArray(messages)) {
        return this.error('Invalid messages format', 'invalid_messages_format');
      }

      // 转换消息格式
      const langchainMessages = messages.map((msg: any) => {
        if (msg.role === 'user') {
          return new HumanMessage(msg.content);
        } else if (msg.role === 'assistant') {
          return new AIMessage(msg.content);
        }
        return new HumanMessage(msg.content);
      });

      // 初始化模型
      const llm = chatModelOpenAI(model);

      // 调用模型获取响应
      const response = await llm.invoke(langchainMessages);

      // 返回响应
      return this.success({
        id: Date.now().toString(),
        choices: [
          {
            message: {
              role: 'assistant',
              content: response.content.toString(),
            },
            finish_reason: 'stop',
          },
        ],
      });
    } catch (error) {
      logger.error('LLM Chat API error:', error);
      return this.error('Internal server error', 'internal_server_error');
    }
  }
}

export const POST = LLMChatController.POST;
