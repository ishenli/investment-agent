/**
 * 检查值是否为非空
 */
function isNotEmpty(value: any): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim() !== '';
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length > 0;
  }

  // 对于数字、布尔值等其他类型，都认为非空
  return true;
}

/**
 * 深度过滤对象或数组中的空值
 */
function deepFilterEmpty(value: any): any {
  if (Array.isArray(value)) {
    const filteredArray = value.map((item) => deepFilterEmpty(item)).filter(isNotEmpty);
    return filteredArray.length > 0 ? filteredArray : undefined;
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const filteredObj: Record<string, any> = {};

    for (const [k, v] of Object.entries(value)) {
      const filteredValue = deepFilterEmpty(v);
      if (isNotEmpty(filteredValue)) {
        filteredObj[k] = filteredValue;
      }
    }

    return Object.keys(filteredObj).length > 0 ? filteredObj : undefined;
  }

  return value;
}

/**
 * 过滤工具参数中的空字段
 * 移除空对象、空数组、null、undefined、空字符串等
 */

export function filterEmptyToolParams(toolParams: Record<string, any>): Record<string, any> {
  if (!toolParams || typeof toolParams !== 'object') {
    return {};
  }

  const filtered: Record<string, any> = {};

  for (const [key, value] of Object.entries(toolParams)) {
    if (isNotEmpty(value)) {
      filtered[key] = deepFilterEmpty(value);
    }
  }

  return filtered;
}

// 使用示例
export function cleanToolUseContent(content: string): string {
  try {
    const parsed = JSON.parse(content) || {};
    const { toolName, success, ...toolParams } = parsed;

    const filteredParams = filterEmptyToolParams(toolParams);

    return JSON.stringify(
      {
        toolName,
        success,
        ...filteredParams,
      },
      null,
      2,
    );
  } catch (error) {
    console.error('Failed to parse tool use content:', error);
    return content;
  }
}
