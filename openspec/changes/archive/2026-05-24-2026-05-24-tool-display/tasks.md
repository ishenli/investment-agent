# Phase 1 (MVP) 任务清单：设置页工具展示功能

> **文档状态**: Ready for Development  
> **基于计划**: `open-specs/plan.md` — Phase 1 (MVP)  
> **目标版本**: v0.15.0  
> **总预估工时**: 18.5 小时 ~ 2.5 人日（单线串行）→ 1.5 人日（关键路径并行）  
> **最后更新**: 2026-05-24

---

## 0. 任务总览

```
关键路径：T0 → T1 → T2 → T3 → T5/T6 → T8 → T9 → T10 → T11
```

| 阶段 | 任务 | 角色 | 预估工时 | 优先级 |
|------|------|------|----------|--------|
| 准备 | T0: 环境准备与技术预研 | 全栈 | 1h | P0 |
| 后端 | T1: 工具元数据提取模块 | 后端 | 2h | P0 |
| 后端 | T2: 工具元数据服务层 | 后端 | 1.5h | P0 |
| 后端 | T3: API 路由实现 | 后端 | 1h | P0 |
| 后端 | T4: API 接口测试 | 后端 | 1.5h | P0 |
| 前端 | T5: Schema 可视化组件 | 前端 | 2h | P0 |
| 前端 | T6: ToolCard 组件 | 前端 | 2h | P0 |
| 前端 | T7: ToolCategoryGroup 组件 | 前端 | 1h | P1 |
| 前端 | T8: ToolList 容器组件 | 前端 | 2h | P1 |
| 前端 | T9: 设置页改造 (Tabs) | 前端 | 1.5h | P0 |
| 通用 | T10: i18n 国际化文案 | 全栈 | 1h | P1 |
| 通用 | T11: 端到端联调 & 验证 | 全栈 | 2h | P0 |
| 通用 | T12: 自测清单 & 代码 Review | 全栈 | 1h | P1 |

---

## 1. 任务详情

---

### T0: 环境准备与技术预研

| 属性 | 内容 |
|------|------|
| **任务ID** | T0 |
| **标题** | 环境准备与技术预研 |
| **优先级** | P0 |
| **预估工时** | 1h |
| **前置依赖** | 无 |
| **建议角色** | 全栈 |
| **输入** | plan.md、现有代码仓库 |
| **输出** | 预研笔记、技术风险确认 |

**详细描述：**
1. 阅读 `registerBusinessTools.ts`，确认所有工具的 Schema 定义方式（TypeBox）
2. 确认项目中 `BaseController` / `BaseBizController` / `ResultUtil` 的使用模式
3. 确认当前 `API 密钥配置` page.tsx 的结构，确定 Tab 插入位置
4. 确认 `locales` 目录结构（`zh-CN/setting.json`、`en-US/setting.json`）
5. 确认是否存在已有的工具列表渲染组件或 `SchemaViewer` 类似实现

**验收标准 (AC):**
- [ ] 列出所有 34 个工具的 `name`、`description`、`category` 映射表
- [ ] 确认 `BaseController` 的哪一版子类（`BaseBizController` 还是直接 `BaseController`）适用于无数据库的只读接口
- [ ] 确认 `setting.json` 中当前已有的 `tool.*` 键，避免命名冲突
- [ ] 输出一份简短的技术预研笔记（< 500字）

---

### T1: 工具元数据提取模块

| 属性 | 内容 |
|------|------|
| **任务ID** | T1 |
| **标题** | 工具元数据提取模块 |
| **优先级** | P0 |
| **预估工时** | 2h |
| **前置依赖** | T0 |
| **建议角色** | 后端 |
| **输入** | `registerBusinessTools.ts` (791行)、`registerBuiltinTools` 源码 |
| **输出** | `src/server/core/tools/toolMetadata.ts` |

**详细描述：**
1. 新建 `src/server/core/tools/toolMetadata.ts`
2. 定义 `ToolCategory` 联合类型和分类到图标/名称的映射
3. 定义 `BUSINESS_TOOL_DEFINITIONS`：从 `registerBusinessTools.ts` 提取所有工具的名称、描述、Schema（不是运行时 register，而是静态导出定义数组）
4. 定义 `BUILTIN_TOOL_DEFINITIONS`：覆盖 `read_file`、`search_files`、`list_directory`、`web_search`、`web_fetch`、`think`
5. 实现 `extractSchemaProperties(schema)` 递归函数：将 TypeBox JSON Schema 解析为扁平化的 `SchemaProperty[]`（MVP 阶段支持单层/两层嵌套即可）
6. 实现 `buildToolMetadataList()`：合并内置工具 + 业务工具，生成 `ToolMetadata[]`

**关键代码方向：**
```typescript
// src/server/core/tools/toolMetadata.ts
export const BUSINESS_TOOL_DEFINITIONS: RawToolDefinition[] = [
  {
    name: 'stock_get_price',
    description: '获取股票价格',
    category: 'stock',
    schema: Type.Object({
      stock_code: Type.String({ description: '股票代码' }),
      start_date: Type.Optional(Type.String({ description: '起始日期' })),
      end_date: Type.Optional(Type.String({ description: '结束日期' })),
    }),
  },
  // ... 其余 27 个
];

// 内置工具（硬编码，与 engine.ts 中注册保持一致）
export const BUILTIN_TOOL_DEFINITIONS: RawToolDefinition[] = [
  { name: 'read_file', description: '读取文件内容', category: 'system', schema: ... },
  // ... 其余 5 个
];
```

**验收标准 (AC):**
- [ ] `buildToolMetadataList()` 返回 34 个工具的完整列表（6 内置 + 28 业务）
- [ ] 每个 `ToolMetadata` 包含 `name`、`description`、`category`、`source`、`schema`、`parameters`
- [ ] `parameters` 数组正确解析了所有 `Type.String`、`Type.Number`、`Type.Boolean`、`Type.Union`（枚举）、`Type.Optional`
- [ ] 单元测试覆盖 Schema 解析逻辑（≥ 80% 分支覆盖）

---

### T2: 工具元数据服务层

| 属性 | 内容 |
|------|------|
| **任务ID** | T2 |
| **标题** | 工具元数据服务层 |
| **优先级** | P0 |
| **预估工时** | 1.5h |
| **前置依赖** | T1 |
| **建议角色** | 后端 |
| **输入** | T1 产出的 `toolMetadata.ts`、项目 Controller 模式 |
| **输出** | `src/server/controller/toolController.ts`、类型定义文件 |

**详细描述：**
1. 新建 `src/types/tool/metadata.ts` — 前后端共享的类型定义
2. 新建 `src/server/controller/toolController.ts` — 继承 `BaseController` 或 `BaseBizController`
3. 实现 `ToolController.list()` 方法：调用 `buildToolMetadataList()`，返回工具列表
4. 遵循项目既有模式，使用 `ResultUtil` 包装响应

**关键代码方向：**
```typescript
// src/types/tool/metadata.ts
export type ToolCategory = 'system' | 'stock' | 'asset' | 'note' | 'search' | 'transaction' | 'market' | 'report';

export interface SchemaProperty {
  name: string;
  type: string;
  description: string;
  required: boolean;
  enum?: string[];
  children?: SchemaProperty[];
}

export interface ToolMetadata {
  name: string;
  description: string;
  category: ToolCategory;
  source: 'builtin' | 'business';
  schema: Record<string, unknown>;
  parameters: SchemaProperty[];
}
```

```typescript
// src/server/controller/toolController.ts
import { BaseController } from '@server/base/controller/base';
import { ResultUtil } from '@server/base/controller/resultUtil';
import { buildToolMetadataList } from '@server/core/tools/toolMetadata';

export class ToolController extends BaseController {
  async list() {
    const tools = buildToolMetadataList();
    return ResultUtil.success({
      builtinTools: tools.filter((t) => t.source === 'builtin'),
      businessTools: tools.filter((t) => t.source === 'business'),
    });
  }
}
```

**验收标准 (AC):**
- [ ] `GET /api/tools` 返回的 JSON 结构与 plan.md 中定义完全一致
- [ ] 响应 HTTP 状态码 200，无运行时错误
- [ ] Controller 类命名、文件位置符合项目既有约定

---

### T3: API 路由实现

| 属性 | 内容 |
|------|------|
| **任务ID** | T3 |
| **标题** | API 路由实现 |
| **优先级** | P0 |
| **预估工时** | 1h |
| **前置依赖** | T2 |
| **建议角色** | 后端 |
| **输入** | T2 产出的 `ToolController` |
| **输出** | `src/app/api/tools/route.ts` |

**详细描述：**
1. 新建 `src/app/api/tools/route.ts`
2. 遵循项目已有 API 路由模式（参考 `src/app/api/setting/route.ts`）
3. 实现 `GET` 处理器：实例化 `ToolController` 并调用 `list()`
4. 添加基础错误处理

**关键代码方向：**
```typescript
// src/app/api/tools/route.ts
import { NextRequest } from 'next/server';
import { ToolController } from '@server/controller/toolController';

export async function GET(_req: NextRequest) {
  try {
    const controller = new ToolController();
    const result = await controller.list();
    return Response.json(result);
  } catch (error) {
    console.error('[API /tools] Error:', error);
    return Response.json(
      { success: false, message: '获取工具列表失败' },
      { status: 500 }
    );
  }
}
```

**验收标准 (AC):**
- [ ] `curl http://localhost:3000/api/tools` 返回 200 + 正确的 JSON 结构
- [ ] 错误场景返回 `{ success: false, message: '...' }` + HTTP 500
- [ ] 使用 development server (`npm run dev`) 可正常访问

---

### T4: API 接口测试

| 属性 | 内容 |
|------|------|
| **任务ID** | T4 |
| **标题** | API 接口测试 |
| **优先级** | P0 |
| **预估工时** | 1.5h |
| **前置依赖** | T3 |
| **建议角色** | 后端 |
| **输入** | T3 产出的 API 路由 |
| **输出** | API 测试通过 |

**详细描述：**
1. 使用 curl / Postman / 浏览器 DevTools 测试 `GET /api/tools`
2. 验证响应 JSON 中 `builtinTools` 长度为 6，`businessTools` 长度为 28
3. 验证每个工具的字段完整性：`name`、`description`、`category`、`source`、`schema`、`parameters`
4. 验证 Schema 解析正确性：随机抽查 5 个工具，人工核对 `parameters` 是否与 `registerBusinessTools.ts` 中定义一致
5. 验证分类映射：确认 8 个分类都有分布，无空分类

**验收标准 (AC):**
- [ ] `builtinTools.length === 6`
- [ ] `businessTools.length === 28`
- [ ] 所有工具都包含必需的 6 个字段
- [ ] 无 `undefined` 或 `null` 出现在必填字段中
- [ ] 至少抽查 5 个工具的 `parameters` 正确性（包含 `asset_meta_create` 和 `asset_meta_update`）

---

### T5: Schema 可视化组件

| 属性 | 内容 |
|------|------|
| **任务ID** | T5 |
| **标题** | Schema 可视化组件 |
| **优先级** | P0 |
| **预估工时** | 2h |
| **前置依赖** | T0 |
| **建议角色** | 前端 |
| **输入** | `SchemaProperty` 类型定义、shadcn/ui `Collapsible`、`Badge`、`Table` |
| **输出** | `src/app/(pages)/setting/tool/components/SchemaViewer.tsx` |

**详细描述：**
1. 新建 `SchemaViewer.tsx`
2. Props 接口：
   ```typescript
   interface SchemaViewerProps {
     parameters: SchemaProperty[];
     defaultOpen?: boolean;
   }
   ```
3. 实现递归渲染 `SchemaProperty` 树：
   - `type: 'string'` → 显示字符串图标 + Badge
   - `type: 'number'` → 数字图标
   - `type: 'boolean'` → 布尔图标
   - `enum` → 用 Badge 列表展示枚举值
   - `children` → 缩进嵌套渲染
4. 使用 shadcn/ui `Collapsible` 控制展开/折叠
5. 必填字段用 `*` 或红色标记

**UI 方向：**
```
📋 参数 (5)
├─ stock_code   string *     股票代码
├─ start_date   ?string       起始日期
├─ end_date     ?string       结束日期
└─ market       string *      市场
   └─ enum: [CN, US, HK]
```

**验收标准 (AC):**
- [ ] 组件正确渲染所有 `SchemaProperty` 类型
- [ ] 枚举值以 Badge 形式展示
- [ ] 可选字段和必填字段视觉区分明显
- [ ] 点击展开/折叠动画流畅
- [ ] 支持嵌套对象（MVP 阶段至少支持一层嵌套）

---

### T6: ToolCard 组件

| 属性 | 内容 |
|------|------|
| **任务ID** | T6 |
| **标题** | 工具卡片组件 |
| **优先级** | P0 |
| **预估工时** | 2h |
| **前置依赖** | T5 |
| **建议角色** | 前端 |
| **输入** | T5 产出的 `SchemaViewer`、`shadcn/ui Card`、`LucideReact` 图标 |
| **输出** | `src/app/(pages)/setting/tool/components/ToolCard.tsx` |

**详细描述：**
1. 新建 `ToolCard.tsx`
2. Props 接口：
   ```typescript
   interface ToolCardProps {
     tool: ToolMetadata;
   }
   ```
3. 实现卡片布局：
   - **Header**: 分类图标 + 工具名称 (i18n) + Badge (source)
   - **Body**: 描述文字（2行截断）
   - **Footer**: SchemaViewer（折叠状态）
4. 根据 `category` 映射到对应图标：
   - system → `Wrench`
   - stock → `TrendingUp`
   - asset → `Coins`
   - note → `NotebookPen`
   - search → `Search`
   - transaction → `CreditCard`
   - market → `BarChart3`
   - report → `FileText`
5. 卡片使用 hover 阴影效果，提升交互感

**验收标准 (AC):**
- [ ] 卡片正确显示工具名称、描述、分类图标
- [ ] 业务工具显示 "business" Badge，内置工具显示 "builtin" Badge
- [ ] 描述文字超出两行时截断并显示 `...`
- [ ] SchemaViewer 默认折叠，点击展开
- [ ] hover 时有轻微的阴影/缩放过渡效果
- [ ] 支持无障碍访问（aria-label、focus 状态）

---

### T7: ToolCategoryGroup 组件

| 属性 | 内容 |
|------|------|
| **任务ID** | T7 |
| **标题** | 工具分类分组组件 |
| **优先级** | P1 |
| **预估工时** | 1h |
| **前置依赖** | T6 |
| **建议角色** | 前端 |
| **输入** | T6 产出的 `ToolCard`、分类映射配置 |
| **输出** | `src/app/(pages)/setting/tool/components/ToolCategoryGroup.tsx` |

**详细描述：**
1. 新建 `ToolCategoryGroup.tsx`
2. Props 接口：
   ```typescript
   interface ToolCategoryGroupProps {
     category: ToolCategory;
     tools: ToolMetadata[];
   }
   ```
3. 实现：
   - 分类标题栏：图标 + 分类名称（i18n）+ 工具数量 Badge
   - 工具网格：响应式布局（移动端 1列、平板 2列、桌面 3列）
   - 使用 CSS Grid：`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
4. 如果分类下无工具，不渲染该分组（或显示空状态占位）

**验收标准 (AC):**
- [ ] 每个分类正确显示对应的图标和翻译名称
- [ ] 网格在不同屏幕尺寸下响应式适配
- [ ] 分类间有合理的视觉分隔（margin / divider）
- [ ] 空分类不显示或显示友好提示

---

### T8: ToolList 容器组件

| 属性 | 内容 |
|------|------|
| **任务ID** | T8 |
| **标题** | 工具列表容器组件 |
| **优先级** | P1 |
| **预估工时** | 2h |
| **前置依赖** | T7 |
| **建议角色** | 前端 |
| **输入** | T7 产出的 `ToolCategoryGroup`、`/api/tools` 接口、shadcn/ui `Input`、`Select` |
| **输出** | `src/app/(pages)/setting/tool/components/ToolList.tsx` |

**详细描述：**
1. 新建 `ToolList.tsx`
2. 功能实现：
   - **数据获取**: `useEffect` + `fetch('/api/tools')` 获取工具列表
   - **搜索**: 实时过滤工具名和描述（防抖 300ms）
   - **分类筛选**: Select 组件，选项包括「全部」+ 8 个分类
   - **源筛选**: Select 组件，选项「全部/builtin/business」
   - **加载状态**: skeleton loading cards
   - **错误状态**: 友好的错误提示 + 重试按钮
   - **空状态**: 无匹配结果时显示友好提示
3. 内部数据变换：将扁平的 `ToolMetadata[]` 按 `category` 分组为 `Record<ToolCategory, ToolMetadata[]>`

**关键代码方向：**
```typescript
// 过滤逻辑
const filteredTools = useMemo(() => {
  return tools.filter((tool) => {
    const matchSearch = !searchQuery || 
      tool.name.toLowerCase().includes(query) || 
      tool.description.toLowerCase().includes(query);
    const matchCategory = !categoryFilter || tool.category === categoryFilter;
    const matchSource = !sourceFilter || tool.source === sourceFilter;
    return matchSearch && matchCategory && matchSource;
  });
}, [tools, searchQuery, categoryFilter, sourceFilter]);

// 分组
const groupedTools = useMemo(() => {
  return groupBy(filteredTools, 'category');
}, [filteredTools]);
```

**验收标准 (AC):**
- [ ] 页面加载时显示 skeleton loading（至少 3 个占位卡片）
- [ ] 数据加载完成后显示实际内容
- [ ] 搜索输入后 300ms 内触发过滤
- [ ] 分类筛选和搜索可以组合使用
- [ ] 无结果时显示空状态 UI
- [ ] 请求失败时显示错误提示和「重试」按钮

---

### T9: 设置页改造 (Tabs)

| 属性 | 内容 |
|------|------|
| **任务ID** | T9 |
| **标题** | 设置页改造 (Tabs) |
| **优先级** | P0 |
| **预估工时** | 1.5h |
| **前置依赖** | T8 |
| **建议角色** | 前端 |
| **输入** | T8 产出的 `ToolList`、现有 `page.tsx` |
| **输出** | 修改后的 `src/app/(pages)/setting/tool/page.tsx` |

**详细描述：**
1. 修改 `src/app/(pages)/setting/tool/page.tsx`
2. 在现有 `Tabs` 中新增一个 `TabsTrigger`：「内置工具」
3. 新增对应的 `TabsContent`：渲染 `<ToolList />`
4. 默认激活的 Tab 保持为「API 密钥配置」（即当前第一个 Tab）
5. 确保新增 Tab 的样式与现有 3 个 API 密钥 Tab 协调（如果现有 Tab 数量增加导致布局问题，可能需要调整 `grid-cols`）
6. 新增 i18n 键：`tool.tabs.builtin`（中文「内置工具」，英文「Built-in Tools」）

**UI 方向：**
```
<TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
  {ALLOWED_KEYS.map(...)}  {/* 现有 3 个 API 密钥 Tab */}
  <TabsTrigger value="builtin">{t('tool.tabs.builtin')}</TabsTrigger>
</TabsList>
```

> ⚠️ 注意：3 个现有 key + 1 个新增 = 4 个 Tab，`grid-cols-2 lg:grid-cols-4` 正好适配。

**验收标准 (AC):**
- [ ] 页面显示 4 个 Tab（3 个现有 + 1 个新增）
- [ ] 默认选中「API 密钥配置」Tab（不改变现有用户体验）
- [ ] 切换到「内置工具」Tab 正常显示 ToolList
- [ ] Tab 切换动画平滑
- [ ] 各 Tab 内容互不干扰

---

### T10: i18n 国际化文案

| 属性 | 内容 |
|------|------|
| **任务ID** | T10 |
| **标题** | i18n 国际化文案 |
| **优先级** | P1 |
| **预估工时** | 1h |
| **前置依赖** | T9 |
| **建议角色** | 全栈 |
| **输入** | `src/locales/zh-CN/setting.json`、`src/locales/en-US/setting.json` |
| **输出** | 更新后的 locale 文件 |

**详细描述：**
1. 修改 `src/locales/zh-CN/setting.json`，在 `tool` 命名空间下新增：
   ```json
   {
     "tool": {
       "tabs": {
         "builtin": "内置工具"
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
       "builtinTools": {
         "read_file": "读取文件",
         "search_files": "搜索文件",
         ...
       },
       "businessTools": {
         "stock_get_price": "获取股价",
         ...
       },
       "fields": {
         "parameter": "参数",
         "required": "必填",
         "optional": "可选",
         "enum": "可选值"
       },
       "messages": {
         "loadFailed": "加载工具列表失败",
         "retry": "重试",
         "searchPlaceholder": "搜索工具名称或描述...",
         "filterAll": "全部分类",
         "filterBuiltin": "内置工具",
         "filterBusiness": "业务工具",
         "emptyState": "没有找到匹配的工具",
         "parameterCount": "{{count}} 个参数"
       }
     }
   }
   ```
2. 同步更新 `en-US/setting.json`
3. 确保组件中使用 `t('tool.categories.system')` 等键路径

**验收标准 (AC):**
- [ ] 中文 locale 文件包含所有新增键
- [ ] 英文 locale 文件包含对应翻译
- [ ] 页面切换语言后，工具名称、分类、提示文案正确切换
- [ ] 无 `Missing translation` 警告出现在控制台

---

### T11: 端到端联调 & 验证

| 属性 | 内容 |
|------|------|
| **任务ID** | T11 |
| **标题** | 端到端联调 & 验证 |
| **优先级** | P0 |
| **预估工时** | 2h |
| **前置依赖** | T9、T10 |
| **建议角色** | 全栈 |
| **输入** | 完整的前后端代码 |
| **输出** | 联调通过、Bug 修复 |

**详细描述：**
1. 启动 development server：`npm run dev`
2. 访问 `http://localhost:3000/setting/tool`
3. 切换到「内置工具」Tab，验证：
   - 数据加载正常（34 个工具）
   - 分类渲染正确（8 个分类）
   - 搜索过滤工作正常
   - 分类筛选工作正常
   - Schema 展开/折叠正常
   - i18n 切换正常
4. 桌面端和移动端视口测试（DevTools 设备模拟）
5. 控制台无 Error / Warning
6. 修复联调中发现的问题

**验收标准 (AC):**
- [ ] 完整流程：打开页面 → 切换到内置工具 Tab → 看到 34 个工具 → 搜索过滤 → Schema 展开 → 语言切换
- [ ] Chrome / Safari / Firefox 中至少测试 1 个浏览器
- [ ] 移动端视口（375px）下布局正常
- [ ] 控制台无红色 Error
- [ ] 网络面板中 `/api/tools` 请求耗时 < 500ms

---

### T12: 自测清单 & 代码 Review

| 属性 | 内容 |
|------|------|
| **任务ID** | T12 |
| **标题** | 自测清单 & 代码 Review |
| **优先级** | P1 |
| **预估工时** | 1h |
| **前置依赖** | T11 |
| **建议角色** | 全栈 |
| **输入** | 完整代码、自测清单 |
| **输出** | Review 意见、自测报告 |

**自测清单：**

| # | 检查项 | 状态 |
|---|--------|------|
| 1 | TypeScript 编译通过 (`npm run build`) | ⬜ |
| 2 | Lint 通过 (`npm run lint`) | ⬜ |
| 3 | 单元测试通过（如果有新增测试） | ⬜ |
| 4 | `/api/tools` 返回正确的 JSON 结构 | ⬜ |
| 5 | 工具总数 34 个 | ⬜ |
| 6 | 分类总数 8 个 | ⬜ |
| 7 | 搜索功能敏感词/大小写不敏感 | ⬜ |
| 8 | Schema 可折叠 | ⬜ |
| 9 | 空状态正确显示 | ⬜ |
| 10 | 错误状态正确显示 | ⬜ |
| 11 | 语言切换无误 | ⬜ |
| 12 | 移动端响应式正常 | ⬜ |
| 13 | API 密钥配置页面无回归 | ⬜ |

---

## 2. 任务依赖图

```
T0 (环境准备)
  │
  ├──→ T1 (元数据提取)
  │      │
  │      └──→ T2 (服务层)
  │             │
  │             └──→ T3 (API 路由)
  │                    │
  │                    └──→ T4 (API 测试)
  │
  └──→ T5 (SchemaViewer) ──→ T6 (ToolCard) ──→ T7 (CategoryGroup) ──→ T8 (ToolList)
                                                                       │
                                                                       └──→ T9 (页面改造)
                                                                              │
                                                                              ├──→ T10 (i18n)
                                                                              │
                                                                              └──→ T11 (联调)
                                                                                     │
                                                                                     └──→ T12 (Review)
```

---

## 3. 资源分配建议

### 方案 A：单开发者串行（2.5 天）

一位全栈开发者按依赖顺序逐个完成任务。

### 方案 B：前后端并行（1.5 天）

| 开发者 | 负责 | 并行任务 |
|--------|------|----------|
| 后端 | T0、T1、T2、T3、T4 | 串行 |
| 前端 | T0、T5、T6、T7、T8、T9、T10 | T0 共享后并行 |
| 双方 | T11、T12 | 必须等待双方完成 |