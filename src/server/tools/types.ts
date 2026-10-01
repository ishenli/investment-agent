/**
 * Tool adapter types
 *
 * 每个工具文件导出公共业务逻辑 + 多种引擎适配器，
 * 所有适配器共享同一份业务逻辑，只做格式适配。
 */
import type { TObject } from '@sinclair/typebox';

/** Hermes ToolRegistry 适配器配置 */
export interface HermesToolConfig {
  /** 工具名（对应 ToolRegistry.register 的 name） */
  name: string;
  /** 工具描述 */
  description: string;
  /** TypeBox 参数 Schema */
  schema: TObject;
  /** 工具执行 handler */
  handler: (toolCallId: string, args: Record<string, unknown>) => Promise<{
    content: { type: 'text'; text: string }[];
    isError?: boolean;
  }>;
  /** 权限类别 */
  category: 'read' | 'write' | 'system' | 'finance';
}