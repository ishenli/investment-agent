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
/**
 * 补齐推理段缺失的 think 开头标签。
 *
 * 上游推理模型网关(ant DeepSeek 等 OpenAI 兼容实现)把推理链内联进 content,
 * 只在推理到正文的交界处留下一个闭合标签、却不带开头标签,
 * 导致前端 Markdown(Thinking 组件, tag=think)无法配对解析。
 * 推理链位于消息开头,补上开头标签即可恢复配对。
 */
export function ensureThinkOpenTag(content: string): string {
  if (!content) return content;
  if (THINK_OPEN_RE.test(content)) return content;
  return THINK_CLOSE_RE.test(content) ? `${THINK_OPEN_TAG}${content}` : content;
}

/**
 * 移除游离的 think 闭合标签(仅流式 delta 使用)。
 * 推理链在流中已按原文透传,无法回溯补开头标签,故先剥掉游离闭合标签,
 * 避免前端渲染出孤立标签;最终落库内容由 ensureThinkOpenTag 配平。
 */
export function stripThinkCloseTag(content: string): string {
  return (content ?? '').replace(THINK_CLOSE_RE, '');
}

/**
 * 判断内容是否已带 think 开头标签。
 */
export function hasThinkOpenTag(content: string): boolean {
  return THINK_OPEN_RE.test(content ?? '');
}

const THINK_OPEN_TAG = '<think>';
const THINK_OPEN_RE = /<think(?:ing)?>/;
const THINK_CLOSE_RE = /<\/think(?:ing)?>/;
