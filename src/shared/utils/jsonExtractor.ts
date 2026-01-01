/**
 * JSON 提取工具
 * 支持从各种格式的文本中提取 JSON 内容
 */

import { ca } from 'date-fns/locale';

export interface JsonExtractionResult {
  success: boolean;
  data?: unknown;
  rawJson?: string;
  method?: string;
  error?: string;
}

export class JsonExtractor {
  /**
   * 从文本中提取并解析 JSON
   * @param text 包含 JSON 的文本
   * @returns 提取结果
   */
  static extract(text: string): JsonExtractionResult {
    try {
      const json = JSON.parse(text); // 直接是 JSON 文本，直接解析返回
      return {
        success: true,
        data: json,
      };
    } catch (error) {}
    try {
      const extracted = JsonExtractor.extractRawJson(text);

      if (!extracted.rawJson) {
        return {
          success: false,
          error: 'No JSON content found in text',
        };
      }

      // 在解析之前清理 JSON 字符串
      const sanitizedJson = JsonExtractor.sanitizeJsonString(extracted.rawJson);
      const data = JSON.parse(sanitizedJson);
      return {
        success: true,
        data,
        rawJson: sanitizedJson,
        method: extracted.method,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse JSON',
      };
    }
  }

  /**
   * 从文本中提取原始 JSON 字符串
   * @param text 包含 JSON 的文本
   * @returns 提取的原始 JSON 字符串和使用的方法
   */
  static extractRawJson(text: string): {
    rawJson: string | null;
    method: string;
  } {
    const methods = [
      { name: 'markdown_codeblock', fn: JsonExtractor.extractFromMarkdown },
      { name: 'json_object', fn: JsonExtractor.extractJsonObject },
      { name: 'json_array', fn: JsonExtractor.extractJsonArray },
      { name: 'multiline_parsing', fn: JsonExtractor.extractMultilineJson },
      { name: 'simple_trim', fn: (text: string) => text.trim() || null },
    ];

    for (const method of methods) {
      const result = method.fn(text);
      if (result && JsonExtractor.isValidJsonString(result)) {
        return { rawJson: result, method: method.name };
      }
    }

    return { rawJson: null, method: 'none' };
  }

  /**
   * 从 Markdown 代码块中提取 JSON
   */
  private static extractFromMarkdown(text: string): string | null {
    // 匹配 ```json 或 ``` 代码块
    const patterns = [/```json\s*\n?([\s\S]*?)\n?```/i, /```\s*\n?([\s\S]*?)\n?```/];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const content = match[1].trim();
        if (JsonExtractor.looksLikeJson(content)) {
          return content;
        }
      }
    }

    return null;
  }

  /**
   * 提取 JSON 对象
   */
  private static extractJsonObject(text: string): string | null {
    const regex = /\{[\s\S]*\}/;
    const match = text.match(regex);
    return match ? match[0].trim() : null;
  }

  /**
   * 提取 JSON 数组
   */
  private static extractJsonArray(text: string): string | null {
    const regex = /\[[\s\S]*\]/;
    const match = text.match(regex);
    return match ? match[0].trim() : null;
  }

  /**
   * 多行 JSON 解析（精确匹配括号）
   */
  private static extractMultilineJson(text: string): string | null {
    const lines = text.split('\n');
    let jsonStart = -1;
    let jsonEnd = -1;
    let braceCount = 0;
    let bracketCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 跳过空行、注释和明显的非 JSON 行
      if (!line || line.startsWith('//') || line.startsWith('#') || line.startsWith('解析：')) {
        continue;
      }

      // 查找 JSON 开始
      if (jsonStart === -1) {
        if (line.startsWith('{') || line.startsWith('[')) {
          jsonStart = i;
        } else if (line.includes('{') || line.includes('[')) {
          // 行中包含 JSON 开始符号
          const startIndex = Math.max(line.indexOf('{'), line.indexOf('['));
          if (startIndex !== -1) {
            jsonStart = i;
            // 只计算从开始符号后的括号
            const relevantPart = line.substring(startIndex);
            for (const char of relevantPart) {
              if (char === '{') braceCount++;
              else if (char === '[') bracketCount++;
              else if (char === '}') braceCount--;
              else if (char === ']') bracketCount--;
            }
            if (braceCount === 0 && bracketCount === 0) {
              jsonEnd = i;
              break;
            }
            continue;
          }
        }
      }

      // 计算括号匹配
      if (jsonStart !== -1) {
        for (const char of line) {
          if (char === '{') {
            braceCount++;
          } else if (char === '[') {
            bracketCount++;
          } else if (char === '}') {
            braceCount--;
          } else if (char === ']') {
            bracketCount--;
          }
        }

        // 检查是否找到了完整的 JSON 结构
        if (braceCount === 0 && bracketCount === 0) {
          jsonEnd = i;
          break;
        }
      }
    }

    // 如果找到了完整的 JSON 结构
    if (jsonStart !== -1 && jsonEnd !== -1) {
      return lines
        .slice(jsonStart, jsonEnd + 1)
        .join('\n')
        .trim();
    }

    return null;
  }

  /**
   * 检查字符串是否看起来像 JSON
   */
  private static looksLikeJson(text: string): boolean {
    const trimmed = text.trim();
    return (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    );
  }

  /**
   * 验证字符串是否为有效的 JSON
   */
  private static isValidJsonString(text: string): boolean {
    try {
      JSON.parse(text);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 清理 JSON 字符串，处理 LLM 输出中常见的格式问题
   * @param jsonString 原始 JSON 字符串
   * @returns 清理后的 JSON 字符串
   */
  static sanitizeJsonString(jsonString: string): string {
    const cleaned = jsonString
      // 移除 BOM 字符
      .replace(/^\uFEFF/, '')
      // 移除可能的控制字符（除了换行符，我们后面单独处理）
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim();

    // 处理字符串值中的真实换行符
    // 这是一个简单但有效的方法：逐字符处理，在字符串内部时转义换行符
    let result = '';
    let inString = false;
    let escaped = false;

    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];

      if (escaped) {
        result += char;
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        result += char;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        result += char;
        continue;
      }

      if (inString && char === '\n') {
        // 在字符串内部，将真实的换行符转义
        result += '\\n';
        continue;
      }

      if (inString && char === '\r') {
        // 处理回车符
        result += '\\r';
        continue;
      }

      if (inString && char === '\t') {
        // 处理制表符
        result += '\\t';
        continue;
      }

      result += char;
    }

    return result;
  }

  /**
   * 清理 JSON 字符串（移除注释等）
   */
  static cleanJsonString(jsonString: string): string {
    return jsonString
      .split('\n')
      .map((line) => {
        // 移除行注释
        const commentIndex = line.indexOf('//');
        if (commentIndex !== -1) {
          // 确保 // 不在字符串内部
          const beforeComment = line.substring(0, commentIndex);
          const quotes = (beforeComment.match(/"/g) || []).length;
          if (quotes % 2 === 0) {
            return beforeComment.trim();
          }
        }
        return line;
      })
      .filter((line) => line.trim())
      .join('\n');
  }
}

/**
 * 便捷函数：从文本中提取 JSON 数据
 */
export function extractJsonFromText(text: string): JsonExtractionResult {
  const result = JsonExtractor.extract(text);
  return result;
}

/**
 * 便捷函数：尝试解析可能包含 JSON 的文本
 */
export function tryParseJson(text: string, fallback: unknown = {}): unknown {
  const result = JsonExtractor.extract(text);
  return result.success ? result.data : fallback;
}
