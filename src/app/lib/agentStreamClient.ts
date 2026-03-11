import type { AgentStreamEvent } from '@/types/agentStream';
import { get } from 'lodash';

export type AgentStreamClientOptions = {
  api: string;
  body: object;
  headers?: Record<string, string>;
  method?: string;
  signal?: AbortSignal;
  onEvent: (event: AgentStreamEvent) => void;
  onError?: (error: Error) => void;
  onDone?: () => void;
};

/**
 * 统一的 Agent SSE 流客户端
 *
 * 负责：
 * - 发起 SSE HTTP 请求
 * - 解析 `data: {JSON}\n\n` 行，兼容 `[DONE]` 和 `{ type: 'done' }` 结束信号
 * - JSON.parse 后输出 AgentStreamEvent，调用 onEvent 回调
 * - 支持 AbortSignal 取消和错误处理
 */
export async function connectAgentStream({
  api,
  body,
  headers,
  method = 'POST',
  signal,
  onEvent,
  onError,
  onDone,
}: AgentStreamClientOptions): Promise<void> {
  let response: Response;

  try {
    response = await fetch(api, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body || {}),
      signal: signal ?? null,
      credentials: 'include',
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (error.name === 'AbortError') {
      onDone?.();
      return;
    }
    onError?.(error);
    return;
  }

  if (!response.ok) {
    onError?.(new Error(`HTTP error! Status: ${response.status}`));
    return;
  }

  if (!response.body) {
    onError?.(new Error('ReadableStream not supported'));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // 处理缓冲区中剩余内容
        if (buffer.trim()) {
          processLine(buffer.trim(), onEvent);
        }
        onDone?.();
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // 以 \n\n 为 SSE 消息分隔符
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const block = buffer.substring(0, boundary).trim();
        buffer = buffer.substring(boundary + 2);

        for (const line of block.split('\n')) {
          const isDone = processLine(line, onEvent);
          if (isDone) {
            onDone?.();
            reader.cancel().catch(() => {});
            return;
          }
        }

        boundary = buffer.indexOf('\n\n');
      }
    }
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (error.name === 'AbortError') {
      onDone?.();
    } else {
      onError?.(error);
    }
  }
}

/**
 * 解析单行 SSE 数据，返回是否为终止信号
 */
function processLine(line: string, onEvent: (event: AgentStreamEvent) => void): boolean {
  if (!line.startsWith('data:')) return false;

  // 兼容 `data:xxx` 和 `data: xxx`
  const raw = line.startsWith('data: ') ? line.substring(6) : line.substring(5);

  // 旧式 [DONE] 终止信号
  if (raw === '[DONE]') {
    onEvent({ type: 'done' });
    return true;
  }

  try {
    const parsed = JSON.parse(raw) as AgentStreamEvent;
    onEvent(parsed);
    // 新式 type: 'done' 终止信号
    if (parsed.type === 'done') {
      return true;
    }
  } catch {
    // 忽略无法解析的行
  }

  return false;
}


export function formatToolMessage(event: AgentStreamEvent) {

  if (event.type !== 'tool_use') return '';
  const title = event.toolName;

  let content = '';
  /**
   * {"type":"tool_use","id":"xx","toolName":"Skill","arguments":{"skill":"find-skills","args":"股票分析 stock analysis"}}
   */
  if (title === 'Skill') {
    const skill = get(event, 'arguments.skill');
    const args = get(event, 'arguments.args');
    if (skill && args) {
      content = '：' + skill + '(' + args + ')';
    }
    if (skill && !args) {
      content = '：' + skill;
    }
  }

  if (title === 'Bash') {
    const command = get(event, 'arguments.command');
    if (command) {
      content = '(' + command + ')';
    }
  }

  if (title === 'Glob') {
    const pattern = get(event, 'arguments.pattern');
    if (pattern) {
      content = '(' + pattern + ')';
    }
  }
  if (title === 'Write') {
    const url = get(event, 'arguments.file_path');
    if (url) {
      content = '(' + url + ')';
    }
  }

  return `
  \`\`\`bash
  ${title}${content}
  \`\`\`
  `;
}