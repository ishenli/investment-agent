export const extractContent = (content: unknown): string => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter(
        (block): block is { type: 'text'; text: string } =>
          !!block && typeof block === 'object' && (block as { type?: string }).type === 'text',
      )
      .map((block) => block.text)
      .join('');
  }
  return '';
};

export const getMessageRole = (msg: Record<string, unknown>): string => {
  if (typeof (msg as { _getType?: () => string })._getType === 'function') {
    return (msg as { _getType: () => string })._getType();
  }
  if (typeof msg.type === 'string') return msg.type;
  const classId = Array.isArray(msg.id) ? msg.id : [];
  const className = classId[classId.length - 1] || '';
  if (className.includes('Human')) return 'human';
  if (className.includes('AI')) return 'ai';
  if (className.includes('Tool')) return 'tool';
  if (className.includes('System')) return 'system';
  return '';
};

export const getMessageId = (msg: Record<string, unknown>): string | undefined => {
  if (typeof msg.id === 'string') return msg.id;
  const kwargs = msg.kwargs as { id?: string } | undefined;
  return kwargs?.id;
};

export const getMessageContent = (msg: Record<string, unknown>): string => {
  if ('content' in msg) {
    return extractContent(msg.content);
  }
  const kwargs = msg.kwargs as { content?: unknown } | undefined;
  return extractContent(kwargs?.content);
};

export const getToolCalls = (
  msg: Record<string, unknown>,
): Array<{ id?: string; name?: string; args?: Record<string, unknown> }> => {
  if (Array.isArray((msg as { tool_calls?: unknown }).tool_calls)) {
    return (
      msg as { tool_calls: Array<{ id?: string; name?: string; args?: Record<string, unknown> }> }
    ).tool_calls;
  }
  const kwargs = msg.kwargs as
    | { tool_calls?: Array<{ id?: string; name?: string; args?: Record<string, unknown> }> }
    | undefined;
  return kwargs?.tool_calls || [];
};

export const getToolMessageMeta = (
  msg: Record<string, unknown>,
): { toolCallId?: string; toolName?: string; toolArgs?: Record<string, unknown> } => {
  const toolCallId = (msg as { tool_call_id?: string }).tool_call_id;
  const toolName = (msg as { name?: string }).name;
  const kwargs = msg.kwargs as { tool_call_id?: string; name?: string, additional_kwargs?: Record<string, unknown> } | undefined;
  return {
    toolCallId: toolCallId || kwargs?.tool_call_id,
    toolName: toolName || kwargs?.name,
    toolArgs: kwargs?.additional_kwargs,
  };
};

export const appendLog = (entry: unknown): void => {
  console.log(entry);
};
