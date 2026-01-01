import settingService from '@server/service/settingService';
import _ from 'lodash';
import { Base } from 'sdk-base';

const get = _.get;

/**
 * 一个调用模型提供平台的聊天API代理，很多工具封装在远程的 API
 */
export class ChatClient extends Base {
  apiKey?: string;
  baseUrl?: string;

  constructor(options: { apiKey: string; baseUrl?: string }) {
     super({
      initMethod: 'init',
    });
    this.apiKey = options.apiKey;
  }

  async init() {
    const baseUrl = await settingService.getConfigValueByKey('AGENT_PROVIDER_URL');
    this.baseUrl = baseUrl;

    const apiKey = await settingService.getConfigValueByKey('MODEL_PROVIDER_API_KEY');
    this.apiKey = apiKey;

    if (!baseUrl || !apiKey) {
      throw new Error('ChatClient API key is required');
    }
  }

  get headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  public async handleResponse(response: Response) {
    // 首先检查响应是否成功
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    try {
      const result = await response.json();
      // 多个contents返回的数据做下整合
      const contents = get(result, 'data.contents', []);
      const texts = contents
        .map(
          (item: {
            content: {
              text: string;
            };
          }) => get(item, 'content.text', ''),
        )
        .join('\n');

      return {
        // text: get(result, 'data.contents[0].content.text', ''),
        text: texts,
        sessionId: get(result, 'data.sessionId', ''),
        chatId: get(result, 'data.chatId', ''),
      };
    } catch (error) {
      throw new Error(
        `Failed to parse API response: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

export class ChatAgentClient extends ChatClient {
  /**
   * 验证请求参数
   */
  private validateOptions(options: { userId?: string; agentId?: string; query?: string }): void {
    if (!options.userId) {
      throw new Error('userId is required');
    }
    if (!options.agentId) {
      throw new Error('agentId is required');
    }
    if (!options.query) {
      throw new Error('query is required');
    }
  }

  /**
   * 处理API响应
   * @param response
   * @returns
   *
   * {
    "success": true,
    "data": {
        "code": 10000,
        "sessionId": "ad0f2c851f4d41758ee9b7d9b4ca5759_s",
        "chatId": "8cf05034f826454a9fcb95cd3172a372_c",
        "contents": [
            {
                "unitId": "m50f98tbp",
                "indexId": 1,
                "contentType": "text",
                "content": {
                    "text": "好的"
                },
                "createTime": 1741602107399,
                "state": 200
            }
        ],
        "costTime": "21.331",
        "context": {}
    },
    "traceId": "0beb55ad17416020864641029ef4b7"
}
   */

  /**
   * 聊天API
   */
  async chat(options: { userId: string; agentId: string; query: string }) {
    await this.ready();
    try {
      this.validateOptions(options);

      const response = await fetch(`${this.baseUrl}/completion_chat`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(options),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('chat API error:', error);
      throw error;
    }
  }

  /**
   * 流式聊天API
   */
  async stream(options: { userId: string; agentId: string; query: string }) {
    await this.ready();
    try {
      this.validateOptions(options);

      const response = await fetch(`${this.baseUrl}/stream_chat`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(options),
      });

      return this.handleStream(response);
    } catch (error) {
      throw error;
    }
  }

  /**
   * 从响应流中提取指定字段并创建文本流
   * @param response 原始响应
   * @returns 包含文本流的对象
   */
  async handleStream(response: Response) {
    // 确保响应是有效的
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 检查响应是否是流
    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    // 创建一个异步生成器作为文本流
    async function* generateTextStream() {
      try {
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // 解码二进制数据
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // 处理缓冲区中的完整 SSE 消息
          let boundary = buffer.indexOf('\n\n');
          while (boundary !== -1) {
            const line = buffer.substring(0, boundary);
            buffer = buffer.substring(boundary + 2);

            // data: 没有空格
            if (line.startsWith('data:') && line !== 'data: [DONE]') {
              try {
                // 解析 JSON 数据
                const data = JSON.parse(line.substring(5));

                // 提取 contents[0].content.text 字段
                const text = get(data, 'data.contents[0].content.text');
                if (text) {
                  yield text;
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }

            boundary = buffer.indexOf('\n\n');
          }
        }
      } catch (error) {
        console.error('Stream processing error:', error);
        throw error;
      }
    }

    // 返回包含文本流的对象
    return {
      textStream: generateTextStream(),
    };
  }
}
export class ChatAgentProxy {
  chatAgentClient: ChatAgentClient;
  agentId: string;
  apiKey?: string;
  userId: string;
  constructor(options: { agentId: string; apiKey?: string }) {
    this.chatAgentClient = new ChatAgentClient({
      apiKey: options.apiKey || process.env.MODEL_PROVIDER_API_KEY || '',
    });
    this.agentId = options.agentId;
    this.userId = process.env.SESSION_USER_ID || '10000';
  }

  async invoke(input: string) {
    const response = this.chatAgentClient.chat({
      userId: this.userId,
      agentId: this.agentId,
      query: input,
    });

    return response;
  }

  async stream(input: string) {
    const response = this.chatAgentClient.stream({
      userId: this.userId,
      agentId: this.agentId,
      query: input,
    });

    return response;
  }
}
