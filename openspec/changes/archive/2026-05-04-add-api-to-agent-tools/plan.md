# 实现计划：将 Market Info 和 Report API 转换为 Agent Tools

**分支**：`add-api-to-agent-tools` | **日期**：2026-05-04 | **规范**：proposal.md

## 概要

将市场信息和报告相关的 API 注册为 Hermes Agent 工具。**关键决策：Tool 直接调用 Controller 层方法**，复用现有的参数验证、认证和错误处理逻辑。

## 技术上下文

**语言/版本**：TypeScript 5+ / Node.js >= 20
**主要依赖**：Hermes Agent, Zod
**架构决策**：Tool → Controller → Service（而非 Tool → Service）

## 为什么调用 Controller 而非 Service/Business？

| 层级 | 职责 | Tool 调用此层的利弊 |
|------|------|-------------------|
| **API Route** | HTTP 路由处理 | ❌ 需要构造完整 HTTP 请求，开销大 |
| **Controller** | 参数验证、认证、错误处理 | ✅ 最佳选择：复用验证逻辑，直接调用 |
| **Service** | 业务逻辑 | ❌ 绕过验证和认证 |
| **Business** | 框架无关的业务函数 | ❌ 无参数验证 |

**结论**：调用 Controller 方法是最好的折中方案：
- ✅ 复用 Zod Schema 参数验证
- ✅ 复用认证逻辑（`@WithRequestContext`）
- ✅ 复用错误处理和响应格式
- ✅ 避免 HTTP 开销

## 项目结构

### 修改文件

```text
src/server/core/agents/hermes/registerBusinessTools.ts
  - 添加 8 个新工具的 Schema 定义
  - 注册新的工具处理函数，直接调用 Controller 方法
```

## 架构图

```
┌─────────────────────────────────────────────────────────┐
│                     Hermes Agent                         │
│  (调用 registerBusinessTools 注册的工具)                  │
└────────────────────────┬────────────────────────────────┘
                         │ Tool 调用
                         ▼
┌─────────────────────────────────────────────────────────┐
│             registerBusinessTools.ts                     │
│  - 定义 TypeBox Schema（与 Controller Zod Schema 对应）   │
│  - 调用 Controller 方法                                   │
└────────────────────────┬────────────────────────────────┘
                         │ 直接方法调用
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  Controller 层                           │
│  MarketBizController / ReportController                  │
│  - 参数验证（Zod Schema）                                 │
│  - 认证检查（通过 mock Request 或直接传参）               │
│  - 错误处理                                               │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   Service 层                             │
│  assetMarketInfoService / reportService                  │
└─────────────────────────────────────────────────────────┘
```

## 实现方案

### 方案 A：直接调用 Controller 方法（推荐）

```typescript
// registerBusinessTools.ts
import { MarketBizController } from '@server/controller/market';

const marketInfoListSchema = Type.Object({
  assetMetaId: Type.String({ description: '资产元数据 ID' }),
  page: Type.Optional(Type.String({ description: '页码，默认 1' })),
  limit: Type.Optional(Type.String({ description: '每页数量，默认 10' })),
});

registry.register(
  'market_info_list',
  '获取资产市场信息列表',
  marketInfoListSchema,
  async (_id, args) => {
    const controller = new MarketBizController();
    const result = await controller.getAssetMarketInfoList({
      assetMetaId: args.assetMetaId,
      page: args.page,
      limit: args.limit,
    });
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
);
```

**挑战**：Controller 中的 `@WithRequestContext` 装饰器需要 Request 上下文。

### 方案 B：改造 Controller 支持无 Request 调用

提取 Controller 核心逻辑为可复用方法：

```typescript
// market.ts Controller
class MarketBizController {
  // 核心逻辑（可被 Tool 直接调用）
  async getAssetMarketInfoListCore(params: GetAssetMarketInfoListParams) {
    // 参数验证
    const validated = GetAssetMarketInfoListSchema.parse(params);
    // 业务逻辑
    return await assetMarketInfoService.getAssetMarketInfosByAssetMetaId(...);
  }

  // HTTP 接口（带 Request 上下文）
  @WithRequestContext()
  async getAssetMarketInfoList(query: any) {
    return this.getAssetMarketInfoListCore(query);
  }
}
```

### 方案 C：创建 Tool 专用的 Facade 层

```typescript
// src/server/core/business/marketInfoFacade.ts
import { MarketBizController } from '@server/controller/market';
import { GetAssetMarketInfoListSchema } from '@server/controller/market/schemas';

export async function getMarketInfoList(params: unknown) {
  // 1. 参数验证（复用 Controller 的 Schema）
  const validated = GetAssetMarketInfoListSchema.parse(params);
  
  // 2. 直接调用 Service 层（跳过 Controller）
  // 注意：需要处理认证上下文
  return await assetMarketInfoService.getAssetMarketInfosByAssetMetaId(...);
}
```

## 推荐方案

**采用方案 B**：改造 Controller 支持无 Request 调用

理由：
1. 最小化代码重复
2. 完全复用参数验证逻辑
3. 清晰的职责分离
4. 便于维护和测试

## 工具命名

| 工具名称 | 功能 | Controller 方法 |
|---------|------|----------------|
| `market_info_list` | 获取市场信息列表 | `getAssetMarketInfoList` |
| `market_info_latest` | 获取最新市场信息 | `getAssetMarketInfo` |
| `market_info_detail` | 获取市场信息详情 | `getAssetMarketInfo(type='detail')` |
| `market_info_save` | 保存市场信息 | `saveMarketInfo` |
| `market_info_update` | 更新市场信息 | `updateMarketInfo` |
| `market_info_delete` | 删除市场信息 | `deleteMarketInfo` |
| `report_list` | 获取报告列表 | `getReports` |
| `report_detail` | 获取报告详情 | `getReportById` |

## 实现步骤

### Phase 1: 改造 Controller

- [ ] 1.1 提取 Controller 核心逻辑为 `Core` 方法
- [ ] 1.2 导出 Zod Schema 供 Tool 复用

### Phase 2: 注册工具

- [ ] 2.1 将 Zod Schema 转换为 TypeBox Schema
- [ ] 2.2 注册 8 个工具到 `registerBusinessTools.ts`

### Phase 3: 测试

- [ ] 3.1 验证参数验证逻辑生效
- [ ] 3.2 验证 Agent 可以调用新工具

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Controller 需要改造 | 中 | 使用方案 B，提取核心逻辑 |
| 认证上下文缺失 | 低 | Tool 调用时使用系统用户身份 |
