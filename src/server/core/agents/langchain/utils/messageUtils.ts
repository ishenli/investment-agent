import { ToolCall } from '@typings/openai/chat';

const END_OF_THINK = '</think>';

const START_OF_THINK = '<think>';

export const getContentAfterLastThinkTag = (text: string) => {
  if (!text) return '';

  if (!text.includes(START_OF_THINK)) {
    return text;
  }

  let taskString = text;
  while (taskString.includes(END_OF_THINK)) {
    const thinkEndIndex = taskString.indexOf(END_OF_THINK);
    taskString = taskString.substring(thinkEndIndex + END_OF_THINK.length);
  }

  // 如果剩余内容包含未闭合的 <think> 标签，返回空字符串
  if (taskString.includes(START_OF_THINK)) {
    return '';
  }

  return taskString;
};

export type OpenAICompatibleMessage =
  | {
      id: string;
      type: 'text';
      content: string;
    }
  | {
      type: 'tool';
      id: string;
      tools: ToolCall;
    }
  | {
      type: 'tool';
      id: string;
      tools: ToolCall[];
    };
/**
 * 开发一个函数，能够将文本信息转成 openai 规范的消息体
 */

export const convertToOpenAICompatibleMessage = (body: OpenAICompatibleMessage) => {
  if (body.type === 'text') {
    return {
      id: body.id,
      choices: [
        {
          index: 0,
          finish_reason: null,
          delta: {
            role: 'assistant',
            content: body.content,
          },
        },
      ],
    };
  }

  if (body.type === 'tool') {
    const tools = Array.isArray(body.tools) ? body.tools : [body.tools];
    const id = body.id;
    return {
      id: id,
      choices: [
        {
          index: 0,
          finish_reason: 'tool_calls',
          delta: {
            role: 'assistant',
            tool_calls: tools,
          },
        },
      ],
    };
  }
};

export const getAgentLastMessage = (messages: any[]) => {
  if (messages && messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.content) {
      const response = lastMessage.content as string;
      return response;
    }
  }
  return '';
};
