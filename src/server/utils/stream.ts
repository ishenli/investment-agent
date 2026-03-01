/* eslint-disable @typescript-eslint/ban-ts-comment */
export function extractContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (typeof part === 'object' && part) {
          const record = part as Record<string, unknown>;
          if (typeof record.text === 'string') return record.text;
          if (typeof record.content === 'string') return record.content;
        }
        return '';
      })
      .join('');
  }
  return '';
}

export function extractAssistantChunkText(data: unknown): string | null {
  const tuple = data as [unknown, unknown];
  const kwargs =
    tuple?.[0] ||
    ({
      content: '',
    } as {
      content?: string;
    });
  // @ts-expect-error
  const content = extractContent(kwargs?.content);
  return content || null;
}

/**
 * 提取 thinking 模型的思考链 token
 *
 * 支持两种格式：
 * 1. `additional_kwargs.reasoning_content` （OpenAI 兼容实现，如 Kimi/Moonshot、DeepSeek-R1 API）
 * 2. `response_metadata.reasoning_content` （备用位置）
 */
export function extractAssistantReasoningText(data: unknown): string | null {
  const tuple = data as [unknown, unknown];
  const chunk = tuple?.[0] as Record<string, unknown> | undefined;
  if (!chunk) return null;

  // 优先检查 additional_kwargs.reasoning_content
  const additionalKwargs = chunk.additional_kwargs as Record<string, unknown> | undefined;
  if (additionalKwargs?.reasoning_content) {
    const rc = additionalKwargs.reasoning_content;
    if (typeof rc === 'string' && rc.length > 0) return rc;
  }

  // 备用位置： response_metadata.reasoning_content
  const responseMeta = chunk.response_metadata as Record<string, unknown> | undefined;
  if (responseMeta?.reasoning_content) {
    const rc = responseMeta.reasoning_content;
    if (typeof rc === 'string' && rc.length > 0) return rc;
  }

  return null;
}

export function extractChunkId(data: unknown): string {
  const tuple = data as [unknown, unknown];
  const msgChunk = tuple?.[0] as { id?: string } | undefined;
  return msgChunk?.id || '';
}

/**
 * 分离内容中的 <think>…</think> 标签，返回 { reasoning, text }
 *
 * 由于流式 chunk 可能跨块，需要外部传入当前是否在 think 块内的状态。
 *
 * @returns { reasoning, text, inThinkBlock } - reasoning/text 均为当前 chunk 的分离结果
 */
export function splitThinkTagContent(
  raw: string,
  isInsideThinkBlock: boolean,
): { reasoning: string; text: string; inThinkBlock: boolean } {
  let reasoning = '';
  let text = '';
  let inBlock = isInsideThinkBlock;
  let remaining = raw;

  while (remaining.length > 0) {
    if (inBlock) {
      const closeIdx = remaining.indexOf('</think>');
      if (closeIdx === -1) {
        // 整个 chunk 属于 thinking
        reasoning += remaining;
        remaining = '';
      } else {
        reasoning += remaining.substring(0, closeIdx);
        remaining = remaining.substring(closeIdx + 8); // '</think>'.length === 8
        inBlock = false;
      }
    } else {
      const openIdx = remaining.indexOf('<think>');
      if (openIdx === -1) {
        // 整个 chunk 属于正常文本
        text += remaining;
        remaining = '';
      } else {
        text += remaining.substring(0, openIdx);
        remaining = remaining.substring(openIdx + 7); // '<think>'.length === 7
        inBlock = true;
      }
    }
  }

  return { reasoning, text, inThinkBlock: inBlock };
}
