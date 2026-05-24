# Phase 1 (MVP) 实现计划：设置页工具展示功能

> **文档状态**: Approved  
> **基于提案**: `open-specs/tool-display-proposal.md` — Phase 1 (MVP)  
> **目标版本**: v0.15.0  
> **MVP 范围**: 只读展示所有已注册工具（不含开关控制）  
> **最后更新**: 2026-05-24

---

## 1. 技术可行性分析

### 1.1 可行性评估

| 维度 | 评估 | 说明 |
|------|------|------|
| **后端数据源** | ✅ 完全可行 | `registerBusinessTools.ts` 已包含所有 28 个业务工具的名称、描述、TypeBox Schema 定义；`registerBuiltinTools` 注册 6 个内置工具。元数据可静态提取。 |
| **API 层** | ✅ 完全可行 | 项目已有成熟的 `BaseController` + `BaseBizController` + `ResultUtil` 模式，可复用。参考 `src/app/api/setting/route.ts`。 |
| **前端组件** | ✅ 完全可行 | 项目已有 `SkillCard` / `SkillGrid` 组件模式可直接参考；shadcn/ui 提供所有所需组件（Card, Badge, Tabs, Collapsible）。 |
| **i18n** | ✅ 完全可行 | 项目已使用 `react-i18next`，locale 文件在 `src/locales/{zh-CN,en-US}/setting.json`。 |
| **Schema 可视化** | ⚠️ 中等复杂 | TypeBox Schema 为标准 JSON Schema，需递归渲染属性树。MVP 阶段使用简单的表格/列表展示即可。 |

### 1.2 实现复杂度

| 模块 | 复杂度 | 预估工时 |
|------|--------|----------|
| 工具元数据服务 (`toolMetadataService`) | 低 | 2h |
| API 路由 (`/api/tools`) | 低 | 1h |
| 前端页面改造 (Tabs) | 低 | 1h |
| ToolCard 组件 | 中 | 3h |
| ToolCategoryGroup 组件 | 低 | 1.5h |
| ToolList 容器 + 搜索/筛选 | 中 | 2.5h |
| Schema 展示组件 | 中 | 2h |
| i18n 文案 | 低 | 1h |
| 单元测试 + 集成测试 | 中 | 2h |
| **合计** | — | **~16h (2 人日)** |

---

## 2. 技术栈确认

| 层次 | 技术 | 版本 |
|------|------|------|
| Framework | Next.js App Router | 14.x |
| Language | TypeScript | 5.x |
| UI Library | shadcn/ui | latest |
| CSS | Tailwind CSS | 3.x |
| i18n | react-i18next | 14.x |
| Schema | @sinclair/typebox (TypeBox) | 0.32+ |
| State | React useState/useEffect (无需全局 store) | — |
| HTTP | fetch API (浏览器原生) | — |
| Backend Pattern | BaseController + BaseBizController + ResultUtil | 项目自研 |
| Path Aliases | `@/*`, `@server/*`, `@renderer/*`, `@typings/*` | tsconfig.json |

---

## 3. 文件改动清单

### 3.1 新增文件

| 文件路径 | 说明 | 类型 |
|----------|------|------|
| `src/server/core/tools/toolMetadata.ts` | 工具元数据定义 + 分类映射 + 静态工具清单构建 | 后端核心 |
| `src/server/controller/toolController.ts` | 工具 BizController | 后端控制器 |
| `src/app/api/tools/route.ts` | GET /api/tools HTTP 路由 | API 路由 |
| `src/app/(pages)/setting/tool/components/ToolCard.tsx` | 单个工具卡片组件 | 前端组件 |
| `src/app/(pages)/setting/tool/components/ToolCategoryGroup.tsx` | 工具分类分组容器 | 前端组件 |
| `src/app/(pages)/setting/tool/components/ToolList.tsx` | 工具列表容器（含搜索/筛选） | 前端组件 |
| `src/app/(pages)/setting/tool/components/SchemaViewer.tsx` | JSON Schema 可视化组件 | 前端组件 |
| `src/types/tool/metadata.ts` | 工具元数据 TypeScript 类型定义（前后端共享） | 类型定义 |

### 3.2 修改文件

| 文件路径 | 改动说明 |
|----------|----------|
| `src/app/(pages)/setting/tool/page.tsx` | 在顶层 Tabs 中新增「内置工具」TabsTrigger + TabsContent，默认仍选中 API 密钥 |
| `src/locales/zh-CN/setting.json` | 新增 `tool.builtinTools.*` 和 `tool.categories.*` 翻译键 |
| `src/locales/en-US/setting.json` | 同上（英文） |

### 3.3 不改动的文件（明确排除）

| 文件路径 | 原因 |
|----------|------|
| `src/server/core/agents/hermes/engine.ts` | MVP 不涉及工具启用/禁用，engine 无需变更 |
| `src/server/core/agents/hermes/registerBusinessTools.ts` | 不修改注册逻辑，仅读取元数据 |
| 数据库 Schema / drizzle 迁移 | MVP 不需要持久化配置 |

---

## 4. API 详细设计

### 4.1 类型定义

文件：`src/types/tool/metadata.ts`

```typescript
/**
 * 工具分类枚举
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

/**
 * JSON Schema 属性定义（简化）
 */
export interface SchemaProperty {
  /** 属性名 */
  name: string;
  /** 类型 (string | number | boolean | array | object) */
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

/**
 * 工具元数据
 */
export interface ToolMetadata {
  /** 工具唯一名称 */
  name: string;
  /** 工具描述 */
  description: string;
  /** 工具分类 */
  category: ToolCategory;
  /** 工具来源：builtin（内置）或 business（业务） */
  source: 'builtin' | 'business';
  /** 参数 Schema（原始 JSON Schema） */
  schema: Record<string, unknown>;
  /** 解析后的参数列表（用于 UI 渲染） */
  parameters: SchemaProperty[];
}

/**
 * GET /api/tools 响应体
 */
export interface ToolListResponse {
  success: true;
  data: {
    builtinTools: ToolMetadata[];
    businessTools: ToolMetadata[];
    /** 所有分类及其工具数量 */
    categories: Array<{
      name: ToolCategory;
      label: string;
      count: number;
      icon: string;
    }>;
    /** 工具总数 */
    totalCount: number;
  };
}
```

### 4.2 GET /api/tools

**用途**: 返回系统中所有已注册工具的元数据（只读，不需要认证）

**Request**:
```
GET /api/tools
```

无请求参数。

**Response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "builtinTools": [
      {
        "name": "read_file",
        "description": "读取文件内容",
        "category": "system",
        "source": "builtin",
        "schema": {
          "type": "object",
          "properties": {
            "path": { "type": "string", "description": "文件路径" }
          },
          "required": ["path"]
        },
        "parameters": [
          {
            "name": "path",
            "type": "string",
            "description": "文件路径",
            "required": true
          }
        ]
      }
    ],
    "businessTools": [
      {
        "name": "stock_get_price",
        "description": "获取股票价格数据（支持美股、A股、港股）。根据代码自动识别市场。",
        "category": "stock",
        "source": "business",
        "schema": { "..." : "..." },
        "parameters": [
          {
            "name": "stock_code",
            "type": "string",
            "description": "股票代码，如 AAPL, 600519, 0700.HK",
            "required": true
          },
          {
            "name": "start_date",
            "type": "string",
            "description": "开始日期 (YYYY-MM-DD)，默认30天前",
            "required": false
          },
          {
            "name": "end_date",
            "type": "string",
            "description": "结束日期 (YYYY-MM-DD)，默认今天",
            "required": false
          }
        ]
      }
    ],
    "categories": [
      { "name": "system", "label": "系统工具", "count": 6, "icon": "🖥️" },
      { "name": "stock", "label": "股票工具", "count": 4, "icon": "📈" }
    ],
    "totalCount": 34
  }
}
```

**Error Response** (`500`):
```json
{
  "success": false,
  "code": "get_tools_error",
  "message": "获取工具列表失败",
  "data": null
}
```

---

## 5. 后端核心设计

### 5.1 工具元数据服务

文件：`src/server/core/tools/toolMetadata.ts`

```typescript
import type { ToolMetadata, ToolCategory, SchemaProperty } from '@typings/tool/metadata';

/**
 * 工具名 → 分类 映射表
 * 维护在一处，前后端共享分类逻辑
 */
export const TOOL_CATEGORY_MAP: Record<string, ToolCategory> = {
  // system
  read_file: 'system',
  search_files: 'system',
  list_directory: 'system',
  web_search: 'system',
  web_fetch: 'system',
  think: 'system',
  // stock
  stock_get_price: 'stock',
  stock_market_info: 'stock',
  stock_company_info: 'stock',
  stock_search_news: 'stock',
  // asset
  asset_meta_create: 'asset',
  asset_meta_update: 'asset',
  portfolio_query: 'asset',
  // note
  note_query: 'note',
  note_create: 'note',
  note_list: 'note',
  note_get: 'note',
  note_update: 'note',
  note_delete: 'note',
  // search
  tavily_search: 'search',
  db_query: 'search',
  // transaction
  transaction_history: 'transaction',
  transaction_history_by_date: 'transaction',
  account_balance: 'transaction',
  transaction_summary: 'transaction',
  add_transaction: 'transaction',
  // market
  asset_market_info_list: 'market',
  asset_market_info_latest: 'market',
  asset_market_info_detail: 'market',
  asset_market_info_save: 'market',
  asset_market_info_update: 'market',
  asset_market_info_delete: 'market',
  // report
  report_list: 'report',
  report_detail: 'report',
};

/**
 * 分类图标映射
 */
export const CATEGORY_ICONS: Record<ToolCategory, string> = {
  system: '🖥️',
  stock: '📈',
  asset: '💰',
  note: '📝',
  search: '🔍',
  transaction: '💳',
  market: '📊',
  report: '📄',
};

/**
 * 分类排序权重（越小越靠前）
 */
const CATEGORY_ORDER: Record<ToolCategory, number> = {
  system: 0,
  stock: 1,
  asset: 2,
  note: 3,
  search: 4,
  transaction: 5,
  market: 6,
  report: 7,
};

/**
 * 将 TypeBox/JSON Schema 的 properties 解析为扁平的 SchemaProperty 数组
 */
export function parseSchemaProperties(schema: Record<string, unknown>): SchemaProperty[] {
  const properties = (schema as any)?.properties as Record<string, any> | undefined;
  const required = ((schema as any)?.required as string[]) ?? [];

  if (!properties) return [];

  return Object.entries(properties).map(([name, prop]) => {
    const schemaProperty: SchemaProperty = {
      name,
      type: resolveType(prop),
      description: prop.description ?? '',
      required: required.includes(name),
    };

    // 处理枚举值
    if (prop.enum) {
      schemaProperty.enum = prop.enum;
    }
    // 处理 TypeBox Union（anyOf）
    if (prop.anyOf) {
      const enumValues = prop.anyOf
        .filter((item: any) => item.const !== undefined)
        .map((item: any) => String(item.const));
      if (enumValues.length > 0) {
        schemaProperty.enum = enumValues;
      }
    }

    return schemaProperty;
  });
}

function resolveType(prop: any): string {
  if (prop.type) return prop.type;
  if (prop.anyOf) return prop.anyOf.map((a: any) => a.const ?? a.type).join(' | ');
  return 'unknown';
}

/**
 * 内置工具的静态元数据
 * （内置工具的 Schema 不在 registerBusinessTools 中，需要手动定义）
 */
const BUILTIN_TOOLS: ToolMetadata[] = [
  {
    name: 'read_file',
    description: '读取指定路径的文件内容',
    category: 'system',
    source: 'builtin',
    schema: {
      type: 'object',
      properties: { path: { type: 'string', description: '文件路径' } },
      required: ['path'],
    },
    parameters: [{ name: 'path', type: 'string', description: '文件路径', required: true }],
  },
  {
    name: 'search_files',
    description: '按关键词搜索文件',
    category: 'system',
    source: 'builtin',
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' },
        path: { type: 'string', description: '搜索目录路径' },
      },
      required: ['query'],
    },
    parameters: [
      { name: 'query', type: 'string', description: '搜索关键词', required: true },
      { name: 'path', type: 'string', description: '搜索目录路径', required: false },
    ],
  },
  {
    name: 'list_directory',
    description: '列出目录下的文件和子目录',
    category: 'system',
    source: 'builtin',
    schema: {
      type: 'object',
      properties: { path: { type: 'string', description: '目录路径' } },
      required: ['path'],
    },
    parameters: [{ name: 'path', type: 'string', description: '目录路径', required: true }],
  },
  {
    name: 'web_search',
    description: '使用搜索引擎搜索互联网内容',
    category: 'system',
    source: 'builtin',
    schema: {
      type: 'object',
      properties: { query: { type: 'string', description: '搜索关键词' } },
      required: ['query'],
    },
    parameters: [{ name: 'query', type: 'string', description: '搜索关键词', required: true }],
  },
  {
    name: 'web_fetch',
    description: '获取指定 URL 的网页内容',
    category: 'system',
    source: 'builtin',
    schema: {
      type: 'object',
      properties: { url: { type: 'string', description: '网页 URL' } },
      required: ['url'],
    },
    parameters: [{ name: 'url', type: 'string', description: '网页 URL', required: true }],
  },
  {
    name: 'think',
    description: '深度思考和推理，用于复杂问题分析',
    category: 'system',
    source: 'builtin',
    schema: {
      type: 'object',
      properties: { thought: { type: 'string', description: '思考内容' } },
      required: ['thought'],
    },
    parameters: [{ name: 'thought', type: 'string', description: '思考内容', required: true }],
  },
];

/**
 * 业务工具的元数据注册表
 * key: 工具名, value: { description, schema }
 *
 * 此数据在模块加载时从 registerBusinessTools.ts 中的 Schema 定义静态提取。
 * 和 registerBusinessTools() 中的 registry.register() 调用保持同步。
 */
export interface BusinessToolDefinition {
  name: string;
  description: string;
  schema: Record<string, unknown>;
}

/**
 * 获取所有工具元数据（核心函数）
 */
export function getAllToolMetadata(
  businessToolDefs: BusinessToolDefinition[],
): {
  builtinTools: ToolMetadata[];
  businessTools: ToolMetadata[];
} {
  const businessTools: ToolMetadata[] = businessToolDefs.map((def) => ({
    name: def.name,
    description: def.description,
    category: TOOL_CATEGORY_MAP[def.name] ?? 'system',
    source: 'business' as const,
    schema: def.schema,
    parameters: parseSchemaProperties(def.schema),
  }));

  return {
    builtinTools: BUILTIN_TOOLS,
    businessTools,
  };
}

/**
 * 统计分类信息
 */
export function getCategoryStats(tools: ToolMetadata[]): Array<{
  name: ToolCategory;
  label: string;
  count: number;
  icon: string;
}> {
  const countMap = new Map<ToolCategory, number>();
  for (const tool of tools) {
    countMap.set(tool.category, (countMap.get(tool.category) ?? 0) + 1);
  }

  return Array.from(countMap.entries())
    .map(([name, count]) => ({
      name,
      label: name, // 前端通过 i18n 翻译
      count,
      icon: CATEGORY_ICONS[name],
    }))
    .sort((a, b) => (CATEGORY_ORDER[a.name] ?? 99) - (CATEGORY_ORDER[b.name] ?? 99));
}
```

### 5.2 业务工具定义提取

在 `src/server/core/tools/toolMetadata.ts` 中，我们需要从 `registerBusinessTools.ts` 提取工具定义。

**方案**: 在 `registerBusinessTools.ts` 中导出一个静态的工具定义数组（不包含 handler），供 `toolMetadata` 消费。

在 `src/server/core/agents/hermes/registerBusinessTools.ts` 中新增导出：

```typescript
// 在文件末尾新增
export const BUSINESS_TOOL_DEFINITIONS: BusinessToolDefinition[] = [
  { name: 'stock_get_price', description: '获取股票价格数据（支持美股、A股、港股）。根据代码自动识别市场。', schema: stockGetPriceSchema },
  { name: 'stock_market_info', description: '查询资产的市场分析信息（评级、财报分析、投资笔记）', schema: stockMarketInfoSchema },
  // ... 所有 28 个工具
];
```

> **注意**: 此导出仅暴露静态元数据（name + description + TypeBox schema），不包含 handler 函数，不会引入运行时副作用。

### 5.3 控制器层

文件：`src/server/controller/toolController.ts`

```typescript
import { BaseBizController } from './base';
import { getAllToolMetadata, getCategoryStats } from '@server/core/tools/toolMetadata';
import { BUSINESS_TOOL_DEFINITIONS } from '@server/core/agents/hermes/registerBusinessTools';

export class ToolBizController extends BaseBizController {
  async getTools() {
    try {
      const { builtinTools, businessTools } = getAllToolMetadata(BUSINESS_TOOL_DEFINITIONS);
      const allTools = [...builtinTools, ...businessTools];
      const categories = getCategoryStats(allTools);

      return this.success({
        builtinTools,
        businessTools,
        categories,
        totalCount: allTools.length,
      });
    } catch (error) {
      return this.error('获取工具列表失败', 'get_tools_error');
    }
  }
}
```

### 5.4 API 路由层

文件：`src/app/api/tools/route.ts`

```typescript
import { BaseController } from '../base/baseController';
import { ToolBizController } from '@server/controller/toolController';

class ToolHttpController extends BaseController {
  static controller = new ToolBizController();

  static async GET(_request: Request) {
    return Response.json(await ToolHttpController.controller.getTools());
  }
}

export const GET = ToolHttpController.GET;
```

---

## 6. 前端组件树结构

```
src/app/(pages)/setting/tool/page.tsx (修改)
├── Tabs
│   ├── TabsTrigger: "API 密钥配置" (现有，默认选中)
│   ├── TabsTrigger: "内置工具" (新增)
│   │
│   ├── TabsContent: API 密钥配置 (现有，不变)
│   │   └── ... 现有 FINNHUB / FINANCIAL_DATASETS / TAVILY 卡片
│   │
│   └── TabsContent: 内置工具 (新增)
│       └── ToolList (新增)
│           ├── SearchBar (Input + 搜索图标)
│           ├── CategoryFilter (Badge 按钮组 / Tabs)
│           ├── ToolCategoryGroup (按分类分组, 多个)
│           │   ├── 分类标题 (图标 + 名称 + 数量)
│           │   └── ToolCard[] (工具卡片)
│           │       ├── CardHeader (名称 + Badge[source] + Badge[category])
│           │       ├── CardContent (描述文本)
│           │       └── Collapsible (参数详情)
│           │           └── SchemaViewer (参数表格)
│           │               └── SchemaPropertyRow[] (每个参数一行)
│           └── EmptyState (搜索无结果时)
```

### 6.1 组件职责

| 组件 | 文件 | 职责 |
|------|------|------|
| `ToolList` | `components/ToolList.tsx` | 顶层容器：请求数据、管理搜索/筛选状态、按分类分组渲染 |
| `ToolCategoryGroup` | `components/ToolCategoryGroup.tsx` | 分类分组：渲染分类标题 + 内部 ToolCard 网格 |
| `ToolCard` | `components/ToolCard.tsx` | 单个工具卡片：名称、描述、分类 Badge、折叠参数 |
| `SchemaViewer` | `components/SchemaViewer.tsx` | Schema 参数表格：渲染参数名、类型、描述、是否必填 |

### 6.2 ToolCard 组件设计

```typescript
// src/app/(pages)/setting/tool/components/ToolCard.tsx
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@renderer/components/ui/collapsible';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { SchemaViewer } from './SchemaViewer';
import type { ToolMetadata } from '@typings/tool/metadata';
import { useTranslation } from 'react-i18next';

interface ToolCardProps {
  tool: ToolMetadata;
}

const sourceColors: Record<string, string> = {
  builtin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  business: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

export function ToolCard({ tool }: ToolCardProps) {
  const { t } = useTranslation('setting');
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold font-mono leading-tight">
              {tool.name}
            </CardTitle>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge className={sourceColors[tool.source] ?? sourceColors.business}>
                {t(`tool.sources.${tool.source}`)}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {tool.description}
        </p>

        {tool.parameters.length > 0 && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              {isOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
              {t('tool.parameters')} ({tool.parameters.length})
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <SchemaViewer parameters={tool.parameters} />
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
```

### 6.3 SchemaViewer 组件设计

```typescript
// src/app/(pages)/setting/tool/components/SchemaViewer.tsx
'use client';

import * as React from 'react';
import { Badge } from '@renderer/components/ui/badge';
import type { SchemaProperty } from '@typings/tool/metadata';
import { useTranslation } from 'react-i18next';

interface SchemaViewerProps {
  parameters: SchemaProperty[];
}

export function SchemaViewer({ parameters }: SchemaViewerProps) {
  const { t } = useTranslation('setting');

  return (
    <div className="rounded-md border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left font-medium">{t('tool.schema.name')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('tool.schema.type')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('tool.schema.required')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('tool.schema.description')}</th>
          </tr>
        </thead>
        <tbody>
          {parameters.map((param) => (
            <tr key={param.name} className="border-b last:border-0">
              <td className="px-3 py-2 font-mono text-xs">{param.name}</td>
              <td className="px-3 py-2">
                <Badge variant="outline" className="text-xs font-mono">
                  {param.type}
                </Badge>
              </td>
              <td className="px-3 py-2">
                {param.required ? (
                  <Badge variant="destructive" className="text-xs">
                    {t('tool.schema.yes')}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    {t('tool.schema.no')}
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-muted-foreground text-xs max-w-[300px]">
                {param.description}
                {param.enum && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {param.enum.map((v) => (
                      <Badge key={v} variant="secondary" className="text-xs">
                        {v}
                      </Badge>
                    ))}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 7. 数据流时序图（文字描述）

### 7.1 页面加载时序

```
1. 用户点击「设置 → 工具」菜单
     │
2. Next.js 渲染 page.tsx（客户端组件）
     │
3. 用户点击「内置工具」Tab
     │
4. ToolList 组件 mount → useEffect 触发
     │
5. 前端发起 GET /api/tools 请求
     │
6. Next.js API Route 接收请求
     │ → ToolHttpController.GET()
     │ → ToolBizController.getTools()
     │ → getAllToolMetadata(BUSINESS_TOOL_DEFINITIONS)
     │   ├─ 读取 BUILTIN_TOOLS 静态数组（6 个内置工具）
     │   ├─ 遍历 BUSINESS_TOOL_DEFINITIONS（28 个业务工具）
     │   │  ├─ 查 TOOL_CATEGORY_MAP 获取分类
     │   │  └─ 调 parseSchemaProperties() 解析 Schema
     │   └─ 返回 { builtinTools, businessTools }
     │ → getCategoryStats(allTools) 统计分类数量
     │ → ResultUtil.success(data) 包装响应
     │
7. 前端收到 JSON 响应
     │ → 更新 state: tools, categories
     │ → 根据 searchQuery 和 selectedCategory 过滤工具
     │ → 按 category 分组
     │
8. 渲染 ToolCategoryGroup[] → ToolCard[] → SchemaViewer
     │
9. 用户在搜索框输入关键词
     │ → 本地过滤（不发新请求）
     │ → 重新渲染匹配的工具卡片
     │
10. 用户点击分类筛选按钮
     │ → 本地过滤
     │ → 只显示该分类下的工具
```

### 7.2 性能优化说明

- **数据缓存**: 工具元数据为静态数据，页面切换回「内置工具」Tab 时不重新请求（使用 React state 保持）
- **搜索/筛选**: 纯客户端过滤，无需后端参与
- **Schema 折叠**: 参数详情默认折叠，减少初始 DOM 节点
- **响应体积**: 34 个工具的完整元数据约 15-20KB（gzip 后 ~4KB），远低于 500ms 限制

---

## 8. 页面改造详细设计

### 8.1 page.tsx 改造

在现有 `page.tsx` 的 Tabs 组件中新增一项：

```typescript
// 改造后的 Tabs 结构
<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
  <TabsList className="grid w-full grid-cols-2">
    <TabsTrigger value="api-keys">
      {t('tool.tabs.apiKeys', 'API 密钥配置')}
    </TabsTrigger>
    <TabsTrigger value="builtin-tools">
      {t('tool.tabs.builtinTools', '内置工具')}
    </TabsTrigger>
  </TabsList>

  {/* API 密钥 Tab —— 将现有的每个 key 的 TabsContent 嵌入一个内嵌 Tabs 或者直接用 Accordion */}
  <TabsContent value="api-keys">
    {/* 现有的 API 密钥配置内容，保持不变 */}
    <Tabs value={activeKeyTab} onValueChange={setActiveKeyTab}>
      <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
        {ALLOWED_KEYS.map((key) => (
          <TabsTrigger key={key} value={key} className="text-sm">
            {/* ... 现有代码 ... */}
          </TabsTrigger>
        ))}
      </TabsList>
      {/* ... 现有 TabsContent ... */}
    </Tabs>
  </TabsContent>

  {/* 内置工具 Tab —— 新增 */}
  <TabsContent value="builtin-tools">
    <ToolList />
  </TabsContent>
</Tabs>
```

### 8.2 顶层 Tab 设计决策

- 将现有的 `FINNHUB / FINANCIAL_DATASETS / TAVILY` 三个 Tab 降级为「API 密钥配置」Tab 的内嵌子 Tab
- 顶层只有两个 Tab：「API 密钥配置」和「内置工具」
- 默认选中「API 密钥配置」，保证向后兼容

---

## 9. i18n 文案设计

### 9.1 中文 (`src/locales/zh-CN/setting.json`)

在现有 `tool` 对象中新增以下键：

```json
{
  "tool": {
    "tabs": {
      "apiKeys": "API 密钥配置",
      "builtinTools": "内置工具"
    },
    "builtinToolsTitle": "系统内置工具",
    "builtinToolsDescription": "以下为系统已注册的 AI 工具，Agent 可在对话中自动调用。",
    "searchPlaceholder": "搜索工具名称或描述...",
    "filterAll": "全部",
    "toolCount": "共 {{count}} 个工具",
    "noToolsFound": "未找到匹配的工具",
    "adjustSearch": "请尝试调整搜索关键词或筛选条件",
    "parameters": "参数",
    "loadingTools": "加载工具列表...",
    "loadFailed": "加载工具列表失败",
    "retry": "重试",
    "sources": {
      "builtin": "内置",
      "business": "业务"
    },
    "categories": {
      "system": "系统工具",
      "stock": "股票工具",
      "asset": "资产工具",
      "note": "笔记工具",
      "search": "搜索工具",
      "transaction": "交易工具",
      "market": "市场信息",
      "report": "报告工具"
    },
    "schema": {
      "name": "参数名",
      "type": "类型",
      "required": "必填",
      "description": "说明",
      "yes": "是",
      "no": "否"
    }
  }
}
```

### 9.2 英文 (`src/locales/en-US/setting.json`)

```json
{
  "tool": {
    "tabs": {
      "apiKeys": "API Keys",
      "builtinTools": "Built-in Tools"
    },
    "builtinToolsTitle": "System Built-in Tools",
    "builtinToolsDescription": "These are registered AI tools that the Agent can invoke during conversations.",
    "searchPlaceholder": "Search tool name or description...",
    "filterAll": "All",
    "toolCount": "{{count}} tools",
    "noToolsFound": "No matching tools found",
    "adjustSearch": "Try adjusting your search or filter criteria",
    "parameters": "Parameters",
    "loadingTools": "Loading tools...",
    "loadFailed": "Failed to load tools",
    "retry": "Retry",
    "sources": {
      "builtin": "Built-in",
      "business": "Business"
    },
    "categories": {
      "system": "System",
      "stock": "Stock",
      "asset": "Asset",
      "note": "Note",
      "search": "Search",
      "transaction": "Transaction",
      "market": "Market",
      "report": "Report"
    },
    "schema": {
      "name": "Name",
      "type": "Type",
      "required": "Required",
      "description": "Description",
      "yes": "Yes",
      "no": "No"
    }
  }
}
```

---

## 10. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| **TypeBox Schema 序列化差异** | 中 | TypeBox 的 `Type.Optional()` / `Type.Union()` 在 JSON.stringify 后的结构可能与标准 JSON Schema 不完全一致 | `parseSchemaProperties()` 中需要处理 TypeBox 特有的 `anyOf` / `[Kind]` 等字段；编写单元测试覆盖所有 Schema 变体 |
| **Schema 体积过大** | 低 | `add_transaction` 和 `asset_market_info_save` 的 Schema 较复杂（10+ 个参数） | MVP 阶段默认折叠参数详情；34 个工具总数据量约 15-20KB，可接受 |
| **registerBusinessTools.ts 导出副作用** | 低 | 新增的 `BUSINESS_TOOL_DEFINITIONS` 导出需确保不引入 Controller 实例化等副作用 | Schema 定义在模块顶层（与 handler 分离），不会触发副作用；通过代码审查确认 |
| **页面 Tab 改造兼容性** | 低 | 现有用户可能有书签指向 `/setting/tool`，Tab 结构变化后默认视图不同 | 默认选中「API 密钥配置」Tab，保持向后兼容 |
| **i18n 键命名冲突** | 极低 | 新增的 `tool.tabs.apiKeys` 等键可能与现有键冲突 | 现有键在 `tool.descriptions.*` / `tool.details.*` 等子对象下，不冲突；通过 grep 确认 |
| **移动端布局** | 中 | 34 个工具卡片在小屏幕上显示可能拥挤 | 响应式设计：移动端单列、桌面端双列；分类折叠 |

---

## 11. 回滚方案

### 11.1 回滚策略

由于 Phase 1 (MVP) 是纯增量改动（新增文件 + 现有页面增加 Tab），回滚非常简单：

**方案 A: Git Revert**
```bash
# 假设所有 Phase 1 改动在一个 PR 合入
git revert <merge-commit-hash>
```

**方案 B: 功能开关（推荐）**

在 `page.tsx` 中添加功能开关：

```typescript
const FEATURE_BUILTIN_TOOLS_TAB = process.env.NEXT_PUBLIC_FEATURE_TOOLS_TAB !== 'false';
```

上线后如发现问题：
```bash
# .env.local
NEXT_PUBLIC_FEATURE_TOOLS_TAB=false
```

### 11.2 回滚影响范围

| 改动 | 回滚方式 | 影响 |
|------|----------|------|
| 新增 API `/api/tools` | 删除文件或停止导出 | 无影响（无其他模块依赖） |
| 新增前端组件 | 删除文件 | 无影响（仅被 page.tsx 引用） |
| page.tsx Tab 改造 | 恢复原 Tabs 结构 | 无数据丢失 |
| i18n 文案 | 保留（多余键无副作用）或删除 | 无影响 |
| 类型定义 `src/types/tool/metadata.ts` | 删除文件 | 无影响（仅被新增代码引用） |

### 11.3 数据安全

Phase 1 (MVP) **不涉及任何数据库变更**，不需要数据迁移或回滚脚本。

---

## 12. 测试策略

### 12.1 单元测试

| 测试文件 | 覆盖范围 |
|----------|----------|
| `src/server/core/tools/__tests__/toolMetadata.test.ts` | `parseSchemaProperties()` 解析各种 TypeBox Schema |
| | `getAllToolMetadata()` 返回正确数量和结构 |
| | `getCategoryStats()` 统计正确 |
| | `TOOL_CATEGORY_MAP` 覆盖所有 34 个工具名 |

### 12.2 API 测试

| 测试 | 验证 |
|------|------|
| `GET /api/tools` 200 | 返回 `{ success: true, data: { builtinTools, businessTools, categories, totalCount } }` |
| `builtinTools.length === 6` | 6 个内置工具 |
| `businessTools.length === 28` | 28 个业务工具 |
| 每个工具有完整字段 | `name`, `description`, `category`, `source`, `schema`, `parameters` |

### 12.3 前端测试（手动）

| 场景 | 验证 |
|------|------|
| 页面加载 | 默认显示「API 密钥配置」Tab |
| 切换 Tab | 点击「内置工具」Tab 显示工具列表 |
| 搜索 | 输入关键词实时过滤工具卡片 |
| 分类筛选 | 点击分类按钮只显示对应工具 |
| Schema 折叠 | 点击「参数」展开/折叠参数表格 |
| 响应式 | 移动端和桌面端正常显示 |
| 深色模式 | 深色模式下卡片样式正确 |

---

## 附录 A: 目录结构一览

```
src/
├── types/
│   └── tool/
│       └── metadata.ts                    ← 新增：共享类型定义
├── server/
│   ├── core/
│   │   ├── tools/
│   │   │   └── toolMetadata.ts            ← 新增：工具元数据服务
│   │   └── agents/hermes/
│   │       └── registerBusinessTools.ts   ← 修改：导出 BUSINESS_TOOL_DEFINITIONS
│   └── controller/
│       └── toolController.ts              ← 新增：业务控制器
├── app/
│   ├── api/
│   │   └── tools/
│   │       └── route.ts                   ← 新增：API 路由
│   └── (pages)/
│       └── setting/
│           └── tool/
│               ├── page.tsx               ← 修改：新增 Tab
│               └── components/
│                   ├── ToolList.tsx        ← 新增：工具列表容器
│                   ├── ToolCategoryGroup.tsx  ← 新增：分类分组
│                   ├── ToolCard.tsx        ← 新增：工具卡片
│                   └── SchemaViewer.tsx    ← 新增：Schema 查看器
└── locales/
    ├── zh-CN/setting.json                 ← 修改：新增 i18n 键
    └── en-US/setting.json                 ← 修改：新增 i18n 键
```
