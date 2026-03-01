/**
 * 工具名称映射工具
 * 将内部工具 ID (如 mcp__ig-tools__dbQueryTool) 转换为用户友好的显示名称
 */

export interface ToolNameMapping {
  /** 内部工具 ID */
  id: string;
  /** 显示名称(中文) */
  displayName: string;
  /** 显示名称(英文) */
  displayNameEn: string;
  /** 图标 emoji(可选) */
  icon?: string;
  /** 工具类别 */
  category?: 'database' | 'market' | 'search' | 'analysis' | 'system';
}

/**
 * 工具名称映射表
 */
const TOOL_NAME_MAPPINGS: ToolNameMapping[] = [
  // 数据库查询工具
  {
    id: 'mcp__ig-tools__dbQueryTool',
    displayName: '数据库查询',
    displayNameEn: 'Database Query',
    icon: '',
    category: 'database',
  },
  
  // 笔记查询工具
  {
    id: 'mcp__ig-tools__noteQueryTool',
    displayName: '笔记查询',
    displayNameEn: 'Note Query',
    icon: '',
    category: 'database',
  },
  
  // 股票价格查询
  {
    id: 'mcp__ig-tools__stockGetPriceTool',
    displayName: '股票价格查询',
    displayNameEn: 'Stock Price',
    icon: '',
    category: 'market',
  },
  
  // 市场信息召回 
  {
    id: 'mcp__ig-tools__stockRecallMarketInfoTool',
    displayName: '市场信息查询',
    displayNameEn: 'Market Info',
    icon: '',
    category: 'market',
  },
  
  // 公司信息召回
  {
    id: 'mcp__ig-tools__stockRecallCompanyInfoTool',
    displayName: '公司信息查询',
    displayNameEn: 'Company Info',
    icon: '',
    category: 'market',
  },
  
  // 股票新闻搜索
  {
    id: 'mcp__ig-tools__stockSearchNewsTool',
    displayName: '股票新闻搜索',
    displayNameEn: 'Stock News',
    icon: '',
    category: 'search',
  },
  
  // Tavily 搜索
  {
    id: 'mcp__ig-tools__TravilySearchTool',
    displayName: '网络搜索',
    displayNameEn: 'Web Search',
    icon: '',
    category: 'search',
  },
  
  // 天气查询示例
  {
    id: 'mcp__ig-tools__get_weather',
    displayName: '天气查询',
    displayNameEn: 'Weather',
    icon: '',
    category: 'system',
  },
  
  // 资产信息搜索
  {
    id: 'mcp__ig-tools__search_asset_info',
    displayName: '资产信息搜索',
    displayNameEn: 'Asset Search',
    icon: '',
    category: 'market',
  },
];

/**
 * 工具名称映射缓存
 */
const toolNameMapCache = new Map<string, ToolNameMapping>();
TOOL_NAME_MAPPINGS.forEach((mapping) => {
  toolNameMapCache.set(mapping.id, mapping);
});

/**
 * 获取工具的友好显示名称
 * @param toolId 内部工具 ID
 * @param locale 语言环境 ('zh-CN' | 'en-US')
 * @param includeIcon 是否包含图标
 * @returns 友好显示名称
 */
export function getToolDisplayName(
  toolId: string,
  locale: 'zh-CN' | 'en-US' = 'zh-CN',
  includeIcon: boolean = false,
): string {
  const mapping = toolNameMapCache.get(toolId);
  
  if (!mapping) {
    // 如果没有映射,尝试从 ID 中提取可读名称
    return formatToolIdFallback(toolId);
  }
  
  const name = locale === 'zh-CN' ? mapping.displayName : mapping.displayNameEn;
  
  if (includeIcon && mapping.icon) {
    return `${mapping.icon} ${name}`;
  }
  
  return name;
}

/**
 * 获取工具的完整信息
 * @param toolId 内部工具 ID
 * @returns 工具映射信息,如果不存在则返回 null
 */
export function getToolMapping(toolId: string): ToolNameMapping | null {
  return toolNameMapCache.get(toolId) || null;
}

/**
 * 从工具 ID 中提取可读名称(兜底方案)
 * 例: mcp__ig-tools__dbQueryTool -> DB Query Tool
 */
function formatToolIdFallback(toolId: string): string {
  // 移除前缀
  const withoutPrefix = toolId.replace(/^mcp__ig-tools__/, '');
  
  // 转换驼峰为空格分隔
  const spaced = withoutPrefix
    .replace(/([A-Z])/g, ' $1')
    .trim();
  
  // 首字母大写
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * 批量获取工具显示名称
 * @param toolIds 工具 ID 数组
 * @param locale 语言环境
 * @returns 工具 ID 到显示名称的映射
 */
export function batchGetToolDisplayNames(
  toolIds: string[],
  locale: 'zh-CN' | 'en-US' = 'zh-CN',
): Record<string, string> {
  const result: Record<string, string> = {};
  
  toolIds.forEach((toolId) => {
    result[toolId] = getToolDisplayName(toolId, locale);
  });
  
  return result;
}

/**
 * 获取所有已注册的工具映射
 * @returns 所有工具映射数组
 */
export function getAllToolMappings(): ToolNameMapping[] {
  return [...TOOL_NAME_MAPPINGS];
}

/**
 * 按类别获取工具映射
 * @param category 工具类别
 * @returns 该类别的所有工具映射
 */
export function getToolMappingsByCategory(
  category: ToolNameMapping['category'],
): ToolNameMapping[] {
  return TOOL_NAME_MAPPINGS.filter((mapping) => mapping.category === category);
}
