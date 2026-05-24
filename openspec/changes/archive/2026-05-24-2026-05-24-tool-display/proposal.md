# OpenSpec: 设置页工具展示功能

> **提案状态**: Draft  
> **提案作者**: AI Agent  
> **目标版本**: v0.15.0  
> **关联模块**: Settings / Tool Management / Hermes Agent

---

## 1. 摘要 (Summary)

当前「设置 → 工具」页面 (`/setting/tool`) 仅支持配置外部 API 密钥（FINNHUB_API_KEY、TAVILY_API_KEY 等），无法让用户直观了解系统内置了哪些 AI 工具、每个工具的功能和参数。本提案建议在现有页面中增加**内置工具展示模块**，以卡片/表格形式展示所有已注册工具，提升系统透明度和可配置性。

---

## 2. 动机 (Motivation)

### 2.1 当前痛点

| 痛点 | 说明 |
|------|------|
| **黑盒感** | 用户不知道 Agent 背后有哪些能力，无法判断哪些问题适合让 Agent 处理 |
| **不可配置** | 所有工具强制启用，无法按需关闭特定工具（如关闭 `stock_search_news` 避免 Tavily 调用） |
| **调试困难** | 开发者和高级用户无法快速查看工具 Schema 定义，难以排查参数错误 |
| **与技能混淆** | 技能（Skills）有独立管理界面，但内置工具没有对应视图 |

### 2.2 期望收益

- **透明度提升**：用户清楚知道 Agent 能做什么
- **精细化控制**：支持按工具启用/禁用，减少不必要的 API 调用和 Token 消耗
- **开发友好**：提供 Schema 可视化，方便调试和扩展

---

## 3. 现状分析 (Current State)

### 3.1 前端页面

**文件**: `src/app/(pages)/setting/tool/page.tsx`

当前结构：
```
ToolSettings (Page)
└── Tabbed Interface (Tabs)
    ├── FINNHUB_API_KEY
    ├── FINANCIAL_DATASETS_KEY
    └── TAVILY_API_KEY
```

每个 Tab 包含：Card > CardHeader (标题+描述) > CardContent (Input + Buttons)

### 3.2 后端工具注册

**文件**: `src/server/core/agents/hermes/registerBusinessTools.ts`

当前系统中注册的工具分为两类：

#### A. 内置工具 (Builtin Tools) — 6个
通过 `registerBuiltinTools()` 注册：

| 工具名 | 功能描述 |
|--------|----------|
| `read_file` | 读取文件内容 |
| `search_files` | 搜索文件 |
| `list_directory` | 列出目录 |
| `web_search` | 网页搜索 |
| `web_fetch` | 获取网页内容 |
| `think` | 深度思考 |

#### B. 业务工具 (Business Tools) — 28个
通过 `registerBusinessTools()` 注册：

| 工具名 | 功能描述 | 分类 |
|--------|----------|------|
| `stock_get_price` | 获取股票价格 | 股票 |
| `stock_market_info` | 获取市场信息 | 股票 |
| `stock_company_info` | 获取公司信息 | 股票 |
| `stock_search_news` | 搜索股票新闻 | 股票 |
| `asset_meta_create` | 创建资产元数据 | 资产 |
| `asset_meta_update` | 更新资产元数据 | 资产 |
| `note_query` | 查询笔记 | 笔记 |
| `note_create` | 创建笔记 | 笔记 |
| `note_list` | 列出笔记 | 笔记 |
| `note_get` | 获取笔记 | 笔记 |
| `note_update` | 更新笔记 | 笔记 |
| `note_delete` | 删除笔记 | 笔记 |
| `tavily_search` | Tavily 搜索 | 搜索 |
| `db_query` | 数据库查询 | 数据 |
| `transaction_history` | 交易历史 | 交易 |
| `transaction_history_by_date` | 按日期查交易 | 交易 |
| `account_balance` | 账户余额 | 交易 |
| `transaction_summary` | 交易汇总 | 交易 |
| `add_transaction` | 添加交易 | 交易 |
| `asset_market_info_list` | 市场信息列表 | 市场 |
| `asset_market_info_latest` | 最新市场信息 | 市场 |
| `asset_market_info_detail` | 市场信息详情 | 市场 |
| `asset_market_info_save` | 保存市场信息 | 市场 |
| `asset_market_info_update` | 更新市场信息 | 市场 |
| `asset_market_info_delete` | 删除市场信息 | 市场 |
| `report_list` | 报告列表 | 报告 |
| `report_detail` | 报告详情 | 报告 |
| `portfolio_query` | 投资组合查询 | 资产 |

### 3.3 工具注册机制

**文件**: `src/server/core/agents/hermes/engine.ts`

```typescript
if (enableTools) {
  registry = ToolRegistry.create();
  registerBuiltinTools(registry, {
    enable: ['read_file', 'search_files', 'list_directory', 'web_search', 'web_fetch', 'think'],
  });
  registerBusinessTools(registry);
  // ... skills
}
```

工具注册为**运行时行为**，当前没有持久化的工具配置表或 API 接口暴露工具清单。

---

## 4. 需求定义 (Requirements)

### 4.1 功能需求 (Functional)

| ID | 需求 | 优先级 | 说明 |
|----|------|--------|------|
| F1 | **工具列表展示** | P0 | 在 setting/tool 页面以卡片/表格展示所有内置工具 |
| F2 | **工具信息展示** | P0 | 每个工具显示：名称、描述、分类、参数 Schema |
| F3 | **工具启用/禁用** | P1 | 支持开关控制单个工具的启用状态 |
| F4 | **分类筛选** | P1 | 按分类（股票/笔记/搜索/交易/市场/报告/资产/系统）筛选 |
| F5 | **Schema 折叠/展开** | P2 | 参数详情默认折叠，点击展开 |
| F6 | **搜索过滤** | P2 | 支持按工具名或描述搜索 |

### 4.2 非功能需求 (Non-Functional)

| ID | 需求 | 优先级 |
|----|------|--------|
| NF1 | **性能** | 工具列表加载 < 500ms |
| NF2 | **响应式** | 适配移动端和桌面端 |
| NF3 | **国际化** | 所有文案支持 i18n |
| NF4 | **向后兼容** | 不改变现有 API 密钥配置功能 |

---

## 5. 技术方案 (Technical Design)

### 5.1 架构变更

```
┌─────────────────────────────────────┐
│  Frontend: /setting/tool/page.tsx   │
│  ┌─────────────────────────────┐    │
│  │  Tab: API 密钥配置 (现有)    │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │  Tab: 内置工具 (新增)        │    │
│  │  - ToolCardList              │    │
│  │  - ToolSearch/Filter         │    │
│  │  - ToolToggleSwitch          │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  API: /api/tools                    │
│  GET  → 返回工具清单 + Schema       │
│  PUT  → 更新工具启用状态            │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Backend: ToolRegistry              │
│  - registerBuiltinTools()           │
│  - registerBusinessTools()          │
│  - ToolRegistry.list()              │
└─────────────────────────────────────┘
```

### 5.2 API 设计

#### GET /api/tools

返回系统中所有已注册工具的元数据。

**Response:**
```json
{
  "success": true,
  "data": {
    "builtinTools": [
      {
        "name": "read_file",
        "description": "读取文件内容",
        "category": "system",
        "enabled": true,
        "schema": {
          "type": "object",
          "properties": {
            "path": { "type": "string", "description": "文件路径" }
          },
          "required": ["path"]
        }
      }
    ],
    "businessTools": [
      {
        "name": "asset_meta_create",
        "description": "创建新的资产元数据记录",
        "category": "asset",
        "enabled": true,
        "schema": { /* TypeBox JSON Schema */ }
      }
    ]
  }
}
```

#### PUT /api/tools

更新工具的启用状态。

**Request:**
```json
{
  "toolName": "stock_search_news",
  "enabled": false
}
```

**Response:**
```json
{
  "success": true,
  "data": { "name": "stock_search_news", "enabled": false }
}
```

### 5.3 数据流

1. **页面加载**: `GET /api/tools` → 获取工具清单
2. **用户操作**: 切换开关 → `PUT /api/tools` → 更新服务端配置
3. **Agent 运行**: `engine.ts` 读取配置 → 只注册启用的工具

### 5.4 存储方案 (P1 阶段)

**方案 A: 数据库存储（推荐 P1）**

新增表 `tool_configs`:

```sql
CREATE TABLE tool_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_name TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);
```

**方案 B: 本地文件存储（MVP 阶段）**

写入 `~/.investment-agent/tool-configs.json`：

```json
{
  "stock_search_news": false,
  "tavily_search": false
}
```

> **建议**: MVP 阶段用方案 B（零数据库迁移），P1 阶段迁移到方案 A。

---

## 6. UI/UX 设计

### 6.1 页面布局

```
┌─────────────────────────────────────────┐
│  API 密钥配置 │  内置工具  │            │  ← Tabs
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🔍 搜索工具...    [全部▼] [系统▼] │   │  ← 搜索 + 筛选
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 📈 股票类工具                    │   │
│  │ ┌─────┐ ┌─────┐ ┌─────┐        │   │
│  │ │stock│ │stock│ │stock│ ...    │   │  ← 分类卡片组
│  │ │get  │ │market│ │company│      │   │
│  │ │price│ │info  │ │info  │      │   │
│  │ └─────┘ └─────┘ └─────┘        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 📝 笔记类工具                    │   │
│  │ ┌─────┐ ┌─────┐ ┌─────┐        │   │
│  │ │note │ │note │ │note │ ...    │   │
│  │ │query│ │create│ │list │       │   │
│  │ └─────┘ └─────┘ └─────┘        │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### 6.2 工具卡片 (ToolCard)

```
┌────────────────────────────────┐
│  🔧 stock_get_price     [toggle]│ ← 名称 + 启用开关
│  ─────────────────────────────  │
│  获取股票价格                    │ ← 描述
│  ┌────────────────────────┐    │
│  │ 📋 参数              ▼ │    │ ← 可折叠 Schema
│  │  • stock_code: string │    │
│  │  • start_date?: string│    │
│  │  • end_date?: string  │    │
│  └────────────────────────┘    │
└────────────────────────────────┘
```

### 6.3 分类定义

| 分类图标 | 分类名 | 包含工具 |
|----------|--------|----------|
| 🖥️ | system | read_file, search_files, list_directory, web_search, web_fetch, think |
| 📈 | stock | stock_get_price, stock_market_info, stock_company_info, stock_search_news |
| 💰 | asset | asset_meta_create, asset_meta_update, portfolio_query |
| 📝 | note | note_query, note_create, note_list, note_get, note_update, note_delete |
| 🔍 | search | tavily_search, db_query |
| 💳 | transaction | transaction_history, transaction_history_by_date, account_balance, transaction_summary, add_transaction |
| 📊 | market | asset_market_info_list, asset_market_info_latest, asset_market_info_detail, asset_market_info_save, asset_market_info_update, asset_market_info_delete |
| 📄 | report | report_list, report_detail |

---

## 7. 实现路径 (Implementation Plan)

### 7.1 Phase 1: 工具展示 (MVP)

**目标**: 只读展示工具列表，不实现开关控制

| 任务 | 文件 | 说明 |
|------|------|------|
| T1 | 新增 `src/app/api/tools/route.ts` | GET 接口，返回工具清单 |
| T2 | 修改 `src/app/(pages)/setting/tool/page.tsx` | 新增「内置工具」Tab |
| T3 | 新增 `src/app/(pages)/setting/tool/components/ToolCard.tsx` | 工具卡片组件 |
| T4 | 新增 `src/app/(pages)/setting/tool/components/ToolCategory.tsx` | 分类容器组件 |
| T5 | i18n 文案 | `public/locales/*/setting.json` |

### 7.2 Phase 2: 工具启用/禁用

**目标**: 支持开关控制

| 任务 | 文件 | 说明 |
|------|------|------|
| T6 | 新增 `src/server/lib/toolConfig.ts` | 工具配置管理类 |
| T7 | 修改 `src/app/api/tools/route.ts` | 增加 PUT 接口 |
| T8 | 修改 `page.tsx` | 连接开关状态 |
| T9 | 修改 `engine.ts` | 根据配置注册工具 |

### 7.3 Phase 3: Schema 可视化增强

**目标**: 美观的参数展示

| 任务 | 说明 |
|------|------|
| T10 | 将 TypeBox Schema 转为 TypeScript 类型免 |
| T11 | 增加参数验证示例 |
| T12 | 支持工具调用历史查看（来自 observabilityService） |

---

## 8. OpenSpec 接口定义

```yaml
# openspec/api/tools.yaml
apiVersion: openspec/v1
kind: API
metadata:
  name: tools-api
  description: 工具管理接口
spec:
  routes:
    - path: /api/tools
      method: GET
      description: 获取所有工具清单
      handler: ToolListHandler
      response:
        type: object
        properties:
          success: { type: boolean }
          data:
            type: object
            properties:
              builtinTools:
                type: array
                items: { $ref: '#/definitions/ToolMetadata' }
              businessTools:
                type: array
                items: { $ref: '#/definitions/ToolMetadata' }

    - path: /api/tools
      method: PUT
      description: 更新工具启用状态
      requestBody:
        type: object
        properties:
          toolName: { type: string }
          enabled: { type: boolean }
      response:
        type: object
        properties:
          success: { type: boolean }
          data:
            type: object
            properties:
              name: { type: string }
              enabled: { type: boolean }

definitions:
  ToolMetadata:
    type: object
    properties:
      name: { type: string }
      description: { type: string }
      category: { type: string, enum: [system, stock, asset, note, search, transaction, market, report] }
      enabled: { type: boolean }
      schema: { type: object }
```

---

## 9. 风险与兼容性

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| **Schema 过大** | 某些工具 Schema 非常复杂，JSON 响应体积大 | 分页加载 / 按需展开 |
| **权限问题** | 普通用户不应修改工具配置 | 增加管理员权限校验（后续） |
| **配置同步** | 多实例部署时配置不一致 | Phase 2 使用数据库存储 |
| **向后兼容** | 新增 Tab 可能影响现有用户习惯 | 默认选中「API 密钥配置」Tab |

---

## 10. 附录：工具名称映射表

用于 i18n 的翻译键定义：

```json
{
  "tool": {
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
      "list_directory": "列出目录",
      "web_search": "网页搜索",
      "web_fetch": "获取网页",
      "think": "深度思考"
    },
    "businessTools": {
      "stock_get_price": "获取股价",
      "stock_market_info": "市场信息",
      "stock_company_info": "公司信息",
      "stock_search_news": "搜索新闻",
      "asset_meta_create": "创建资产",
      "asset_meta_update": "更新资产",
      "note_query": "查询笔记",
      "note_create": "创建笔记",
      "note_list": "笔记列表",
      "note_get": "获取笔记",
      "note_update": "更新笔记",
      "note_delete": "删除笔记",
      "tavily_search": "Tavily 搜索",
      "db_query": "数据库查询",
      "transaction_history": "交易历史",
      "transaction_history_by_date": "按日期查询",
      "account_balance": "账户余额",
      "transaction_summary": "交易汇总",
      "add_transaction": "添加交易",
      "asset_market_info_list": "市场信息列表",
      "asset_market_info_latest": "最新市场信息",
      "asset_market_info_detail": "市场信息详情",
      "asset_market_info_save": "保存市场信息",
      "asset_market_info_update": "更新市场信息",
      "asset_market_info_delete": "删除市场信息",
      "report_list": "报告列表",
      "report_detail": "报告详情",
      "portfolio_query": "投资组合"
    }
  }
}
```

---

## 11. 参考文档

- [Hermes Agent Tool Registry](https://github.com/NousResearch/hermes-agent)
- [Next.js App Router](https://nextjs.org/docs/app)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [TypeBox JSON Schema](https://github.com/sinclairzx81/typebox)
