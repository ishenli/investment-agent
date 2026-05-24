/**
 * 工具元数据类型定义（前后端共享）
 */

export type ToolCategory =
  | 'system'
  | 'stock'
  | 'asset'
  | 'note'
  | 'search'
  | 'transaction'
  | 'market'
  | 'report';

export interface SchemaProperty {
  /** 属性名 */
  name: string;
  /** 类型 */
  type: string;
  /** 属性描述 */
  description: string;
  /** 是否必填 */
  required: boolean;
  /** 枚举值（如果有） */
  enum?: string[];
  /** 子属性（嵌套对象时） */
  children?: SchemaProperty[];
}

export interface ToolMetadata {
  /** 工具唯一名称 */
  name: string;
  /** 工具描述 */
  description: string;
  /** 工具分类 */
  category: ToolCategory;
  /** 工具来源 */
  source: 'builtin' | 'business';
  /** 参数 Schema */
  schema: Record<string, unknown>;
  /** 解析后的参数列表 */
  parameters: SchemaProperty[];
}

export const CATEGORY_ORDER: ToolCategory[] = [
  'system', 'stock', 'asset', 'note', 'search', 'transaction', 'market', 'report',
];

export interface RawToolDefinition {
  name: string;
  description: string;
  category: ToolCategory;
  parameters: SchemaProperty[];
}
